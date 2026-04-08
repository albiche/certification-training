import os
import time
import json
import re
import random
from pathlib import Path
import yaml
import pandas as pd
from bs4 import BeautifulSoup
import undetected_chromedriver as uc
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By

# Racine du projet (scripts/ -> parent = racine)
ROOT = Path(__file__).parent.parent
DATA_RAW = ROOT / "data" / "raw"

try:
    from selenium_stealth import stealth
    HAS_STEALTH = True
except ImportError:
    HAS_STEALTH = False
    print("⚠ selenium-stealth non installé. Lancez : pip install selenium-stealth")

# ── Configuration (depuis config.yaml) ───────────────────────────────────────
def _load_scraping_config() -> dict:
    config_path = ROOT / "config.yaml"
    if not config_path.exists():
        print("Warning: config.yaml introuvable, utilisation des valeurs par défaut.")
        return {}
    with open(config_path, encoding="utf-8") as f:
        return (yaml.safe_load(f) or {}).get("scraping", {})

_scraping = _load_scraping_config()

EXAM_ID                = _scraping.get("exam_id", 12)
START_PAGE             = _scraping.get("start_page", 1)
BASE_URL               = f"https://www.examprepper.co/exam/{EXAM_ID}/{{page}}"
SITE_HOME              = "https://www.examprepper.co/"
MAX_RETRIES            = 3
MAX_CONSECUTIVE_MISSES = 5
RETRY_WAIT             = (15, 30)   # plus long après un blocage
PAGE_WAIT              = (6, 12)    # pause entre pages
CHROME_PROFILE_DIR     = str(ROOT / "chrome_profile")  # profil persistant
# ─────────────────────────────────────────────────────────────────────────────

WINDOW_SIZES = [(1366, 768), (1440, 900), (1536, 864), (1920, 1080)]


def build_driver() -> uc.Chrome:
    w, h = random.choice(WINDOW_SIZES)
    options = uc.ChromeOptions()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(f"--window-size={w},{h}")
    # Profil persistant → cookies / localStorage conservés entre sessions
    options.add_argument(f"--user-data-dir={CHROME_PROFILE_DIR}")
    # Désactive les extensions d'automatisation visibles
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-popup-blocking")

    driver = uc.Chrome(options=options, headless=False, version_main=146)

    if HAS_STEALTH:
        stealth(
            driver,
            languages=["fr-FR", "fr", "en-US", "en"],
            vendor="Google Inc.",
            platform="Win32",
            webgl_vendor="Intel Inc.",
            renderer="Intel Iris OpenGL Engine",
            fix_hairline=True,
        )

    return driver


def human_pause(min_s: float = 0.3, max_s: float = 1.2):
    time.sleep(random.uniform(min_s, max_s))


def simulate_human_scroll(driver):
    try:
        total_height = driver.execute_script("return document.body.scrollHeight")
        steps = random.randint(4, 7)
        for i in range(1, steps + 1):
            target = int((total_height / steps) * i)
            driver.execute_script(f"window.scrollTo(0, {target});")
            human_pause(0.5, 1.4)
        driver.execute_script(f"window.scrollTo(0, {random.randint(0, 300)});")
        human_pause(0.4, 1.0)
    except Exception:
        pass


def simulate_mouse_jitter(driver):
    try:
        body = driver.find_element(By.TAG_NAME, "body")
        actions = ActionChains(driver)
        for _ in range(random.randint(3, 6)):
            x = random.randint(80, 1000)
            y = random.randint(80, 600)
            actions.move_to_element_with_offset(body, x, y)
            actions.pause(random.uniform(0.15, 0.5))
        actions.perform()
    except Exception:
        pass


def warm_up(driver):
    """Visite la page d'accueil pour établir une session légitime avant de scraper."""
    print("Warm-up: chargement de la page d'accueil...")
    driver.get(SITE_HOME)
    time.sleep(random.uniform(6, 10))
    simulate_human_scroll(driver)
    simulate_mouse_jitter(driver)
    human_pause(2, 4)
    print("Warm-up terminé.")


def find_questions_recursively(obj):
    if isinstance(obj, list):
        if obj and all(isinstance(x, dict) for x in obj):
            if any("question_text" in x for x in obj):
                return obj
        for item in obj:
            found = find_questions_recursively(item)
            if found:
                return found
    elif isinstance(obj, dict):
        for value in obj.values():
            found = find_questions_recursively(value)
            if found:
                return found
    return None


def get_soup(driver, url: str) -> BeautifulSoup | None:
    try:
        driver.get(url)
        time.sleep(random.uniform(5.0, 8.5))
        simulate_human_scroll(driver)
        simulate_mouse_jitter(driver)
        human_pause(0.8, 2.0)

        html = driver.page_source
        soup = BeautifulSoup(html, "html.parser")

        next_data_script = soup.find("script", id="__NEXT_DATA__")
        if not next_data_script or not next_data_script.string:
            return None

        data = json.loads(next_data_script.string.strip())
        page_props = data.get("props", {}).get("pageProps", {})
        if not find_questions_recursively(page_props):
            return None

        return soup
    except Exception as e:
        print(f"    Erreur : {e}")
        return None


def extract_questions_table(soup: BeautifulSoup) -> pd.DataFrame:
    html = str(soup)
    next_data_script = soup.find("script", id="__NEXT_DATA__")

    if next_data_script and next_data_script.string:
        data = json.loads(next_data_script.string.strip())
    else:
        match = re.search(
            r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>',
            html, flags=re.DOTALL
        )
        if not match:
            raise ValueError("Bloc __NEXT_DATA__ introuvable dans le HTML.")
        data = json.loads(match.group(1).strip())

    page_props = data.get("props", {}).get("pageProps", {})
    questions = find_questions_recursively(page_props)
    if not questions:
        raise ValueError("Aucune question trouvée dans le JSON.")

    rows = []
    for q in questions:
        choices = q.get("choices", {})
        if isinstance(choices, dict):
            formatted_choices = "\n".join(f"{k}. {v}" for k, v in sorted(choices.items()))
            nb_choices = len(choices)
        else:
            formatted_choices = None
            nb_choices = 0

        answers_community = q.get("answers_community")
        answers_community_str = (
            " | ".join(map(str, answers_community))
            if isinstance(answers_community, list) else None
        )

        discussion = q.get("discussion", [])
        nb_comments = len(discussion) if isinstance(discussion, list) else 0

        rows.append({
            "question_id":       q.get("question_id"),
            "topic":             q.get("topic"),
            "question_text":     q.get("question_text"),
            "choices":           formatted_choices,
            "nb_choices":        nb_choices,
            "answer":            q.get("answer"),
            "answer_ET":         q.get("answer_ET"),
            "answers_community": answers_community_str,
            "nb_comments":       nb_comments,
            "url":               q.get("url"),
        })

    df = pd.DataFrame(rows)
    if not df.empty and "question_id" in df.columns:
        df = df.sort_values("question_id", na_position="last").reset_index(drop=True)
    return df


def save_outputs(df: pd.DataFrame, output_stem: str = "questions_all"):
    csv_path = f"{output_stem}.csv"
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    print(f"CSV généré : {csv_path}")
    try:
        df.to_excel(f"{output_stem}.xlsx", index=False)
        print(f"Excel généré : {output_stem}.xlsx")
    except ModuleNotFoundError:
        print("Export Excel ignoré : module 'openpyxl' non installé.")


def main():
    DATA_RAW.mkdir(parents=True, exist_ok=True)
    driver = build_driver()
    all_dfs = []

    existing_csv = DATA_RAW / f"questions_exam{EXAM_ID}_all.csv"
    if START_PAGE > 1 and existing_csv.exists():
        existing_df = pd.read_csv(str(existing_csv), encoding="utf-8-sig")
        all_dfs.append(existing_df)
        print(f"Reprise page {START_PAGE} — {len(existing_df)} questions déjà chargées.")
    else:
        print(f"Démarrage page {START_PAGE}")

    page = START_PAGE
    consecutive_misses = 0

    try:
        warm_up(driver)

        while consecutive_misses < MAX_CONSECUTIVE_MISSES:
            url = BASE_URL.format(page=page)
            print(f"\nPage {page} — {url}")

            soup = None
            for attempt in range(1, MAX_RETRIES + 1):
                print(f"  Tentative {attempt}/{MAX_RETRIES}...")
                soup = get_soup(driver, url)
                if soup is not None:
                    break
                if attempt < MAX_RETRIES:
                    wait = random.uniform(*RETRY_WAIT)
                    print(f"  Echec — pause {wait:.0f}s avant nouvel essai...")
                    time.sleep(wait)

            if soup is None:
                consecutive_misses += 1
                print(f"  Raté ({consecutive_misses}/{MAX_CONSECUTIVE_MISSES} consécutifs)")
                page += 1
                continue

            consecutive_misses = 0
            df = extract_questions_table(soup)
            df["page"] = page
            all_dfs.append(df)
            print(f"  {len(df)} questions extraites.")
            page += 1

            pause = random.uniform(*PAGE_WAIT)
            print(f"  Pause {pause:.1f}s...")
            time.sleep(pause)

    finally:
        try:
            driver.quit()
        except Exception:
            pass

    if not all_dfs:
        print("Aucune question extraite.")
        return

    combined = pd.concat(all_dfs, ignore_index=True)
    if "question_id" in combined.columns:
        combined = combined.drop_duplicates(subset=["question_id"])
        combined = combined.sort_values("question_id", na_position="last").reset_index(drop=True)

    pd.set_option("display.max_colwidth", 120)
    print(combined[["question_id", "question_text", "answer", "answer_ET", "nb_choices", "nb_comments", "page"]])

    save_outputs(combined, output_stem=str(DATA_RAW / f"questions_exam{EXAM_ID}_all"))
    print(f"\n{len(combined)} questions extraites sur {page - 1} pages visitées.")


if __name__ == "__main__":
    main()
