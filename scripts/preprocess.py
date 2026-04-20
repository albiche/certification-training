"""
preprocess.py
─────────────
Transforme questions_exam12_all.csv en un fichier quiz-ready :
  - Choix éclatés en colonnes dédiées (choice_A … choice_F)
  - Réponse normalisée : "C" ou "B|D|E"
  - Colonne question_type : single / multiple
  - Explication générée via appel API (GPT avec accès internet)
"""

import re
import sys
import time
import yaml
import pandas as pd
from pathlib import Path
from tqdm import tqdm
from openai import OpenAI, RateLimitError, APIError

# Racine du projet (scripts/ -> parent = racine)
ROOT = Path(__file__).parent.parent

# ── Chargement de la configuration ───────────────────────────────────────────

def load_config(path: Path | str = ROOT / "config.yaml") -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

# ── Parsing des choix ─────────────────────────────────────────────────────────

CHOICE_LETTERS = list("ABCDEF")

def parse_choices(raw: str) -> dict[str, str]:
    """
    Extrait les choix depuis un bloc texte, y compris les textes multilignes.
    Capture tout le contenu entre 'A.' et 'B.', entre 'B.' et 'C.', etc.
    Fonctionne que les choix soient séparés par des sauts de ligne ou non.
    """
    if pd.isna(raw):
        return {}
    text = str(raw).strip()
    # Capture de "X." jusqu'au prochain "Y." (word boundary) ou fin de chaîne
    matches = re.findall(r'\b([A-F])\.\s+(.*?)(?=\s*\b[A-F]\.\s+|\Z)', text, re.DOTALL)
    return {letter: content.strip() for letter, content in matches if content.strip()}

# ── Normalisation des réponses ────────────────────────────────────────────────

def normalize_answer(raw) -> tuple[str | None, str]:
    """
    Retourne (answer_normalized, question_type).
    Ex: 'AB'  → ('A|B', 'multiple')
        'C'   → ('C',   'single')
        'B,D' → ('B|D', 'multiple')
    """
    if pd.isna(raw):
        return None, "unknown"
    letters = re.findall(r"[A-Fa-f]", str(raw).upper())
    if not letters:
        return str(raw), "unknown"
    unique = sorted(set(letters))
    return "|".join(unique), "single" if len(unique) == 1 else "multiple"

# ── Appel API pour l'explication ──────────────────────────────────────────────

def build_prompt(question_text: str, choices: dict, answer_normalized: str, topic: str, language: str = "english") -> str:
    choices_block = "\n".join(
        f"{k}. {v}" for k, v in sorted(choices.items())
    )
    answer_letters = answer_normalized.split("|") if answer_normalized else []
    answer_texts = ", ".join(
        f"{l}. {choices.get(l, l)}" for l in answer_letters
    )
    return (
        f"Topic: {topic or 'N/A'}\n\n"
        f"Question: {question_text}\n\n"
        f"Choices:\n{choices_block}\n\n"
        f"Correct answer: {answer_texts}\n\n"
        f"Give a concise but precise explanation (3 to 5 sentences) of why this is the "
        f"correct answer. Be factual, educational, and directly reference the answer choices. "
        f"Write the explanation in {language}."
    )


def get_explanation(
    client: OpenAI,
    model: str,
    prompt: str,
    max_tokens: int,
    temperature: float,
) -> str | None:
    """
    Appelle l'API OpenAI. Supporte les modèles de recherche (web_search_preview)
    et les modèles classiques (chat.completions).
    """
    try:
        if "search" in model.lower():
            response = client.responses.create(
                model=model,
                tools=[{"type": "web_search_preview"}],
                input=prompt,
            )
            return response.output_text.strip()
        else:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content.strip()
    except RateLimitError:
        return None   # signalé en dehors pour retry
    except APIError as e:
        print(f"\n  [API Error] {e}")
        return None
    except Exception as e:
        print(f"\n  [Error] {e}")
        return None


def fetch_explanation_with_retry(
    client: OpenAI,
    model: str,
    prompt: str,
    max_tokens: int,
    temperature: float,
    rpm: int,
    max_retries: int = 4,
) -> str | None:
    delay = 60 / max(rpm, 1)   # délai de base selon RPM configuré
    for attempt in range(1, max_retries + 1):
        result = get_explanation(client, model, prompt, max_tokens, temperature)
        if result is not None:
            time.sleep(delay)
            return result
        wait = delay * (2 ** attempt)
        tqdm.write(f"  Rate limit — attente {wait:.0f}s (tentative {attempt}/{max_retries})")
        time.sleep(wait)
    return None

# ── Filtrage des questions invalides ──────────────────────────────────────────

# Placeholder image généré par le scraper
_IMG_RE = re.compile(r'//img//', re.IGNORECASE)

# Caractères de contrôle, replacement char Unicode, séparateurs de ligne ésotériques
_WEIRD_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\ufffd\u2028\u2029]')

# Entités HTML non décodées résiduelles
_HTML_ENTITY_RE = re.compile(r'&[a-zA-Z]{2,8};|&#\d{1,5};')


def _check_row(row: pd.Series) -> str | None:
    """Retourne la raison de rejet, ou None si la question est valide."""
    choice_a = str(row.get("choice_A") or "").strip()
    answer   = str(row.get("answer")   or "").strip()

    if not choice_a:
        return "choice_A vide (pas de choix)"
    if not answer or answer.lower() == "nan":
        return "réponse manquante"

    fields = [
        str(row.get("question_text") or ""),
        choice_a,
        str(row.get("choice_B") or ""),
        str(row.get("choice_C") or ""),
        str(row.get("choice_D") or ""),
    ]
    combined = " ".join(fields)

    if _IMG_RE.search(combined):
        return "contient //img//"
    if _WEIRD_RE.search(combined):
        return "caractères de contrôle"
    if _HTML_ENTITY_RE.search(combined):
        return "entités HTML non décodées"

    return None


def filter_questions(df: pd.DataFrame) -> pd.DataFrame:
    reasons: dict[str, int] = {}
    keep = []

    for _, row in df.iterrows():
        reason = _check_row(row)
        if reason is None:
            keep.append(True)
        else:
            keep.append(False)
            reasons[reason] = reasons.get(reason, 0) + 1

    df_clean = df[keep].reset_index(drop=True)
    dropped = len(df) - len(df_clean)

    if dropped:
        print(f"  {dropped} question(s) supprimée(s) :")
        for r, n in sorted(reasons.items(), key=lambda x: -x[1]):
            print(f"    · {r} : {n}")
    else:
        print("  Aucune question supprimée.")

    return df_clean


# ── Pipeline principal ────────────────────────────────────────────────────────

def transform(df: pd.DataFrame, answer_field: str) -> pd.DataFrame:
    """Éclate les choix et normalise les réponses — sans toucher à l'API."""
    records = []
    for _, row in df.iterrows():
        choices = parse_choices(row.get("choices"))
        raw_answer = row.get(answer_field) if answer_field in row else row.get("answer")
        answer_norm, q_type = normalize_answer(raw_answer)

        record = {
            "question_id":   row.get("question_id"),
            "topic":         row.get("topic"),
            "question_text": row.get("question_text"),
        }
        # Colonnes de choix
        for letter in CHOICE_LETTERS:
            record[f"choice_{letter}"] = choices.get(letter)

        record["answer"]        = answer_norm
        record["question_type"] = q_type
        record["nb_choices"]    = len(choices)
        record["nb_comments"]   = row.get("nb_comments")
        record["url"]           = row.get("url")
        record["page"]          = row.get("page")

        records.append(record)

    return pd.DataFrame(records)


def add_explanations(df: pd.DataFrame, client: OpenAI, cfg: dict) -> pd.DataFrame:
    model       = cfg["api"]["model"]
    max_tokens  = cfg["api"].get("max_tokens", 350)
    temperature = cfg["api"].get("temperature", 0.3)
    rpm         = cfg["api"].get("requests_per_minute", 20)
    skip        = cfg["preprocessing"].get("skip_existing_explanations", True)
    language    = cfg["preprocessing"].get("explanation_language", "english")

    if "explanation" not in df.columns:
        df["explanation"] = None

    to_process = df[df["explanation"].isna()].index if skip else df.index
    total = len(to_process)

    if total == 0:
        print("Toutes les explications sont déjà présentes — rien à générer.")
        return df

    print(f"\nGénération de {total} explications via {model}...")
    for idx in tqdm(to_process, total=total, unit="q"):
        row = df.loc[idx]
        choices = {
            letter: row.get(f"choice_{letter}")
            for letter in CHOICE_LETTERS
            if pd.notna(row.get(f"choice_{letter}"))
        }
        prompt = build_prompt(
            question_text=str(row.get("question_text", "")),
            choices=choices,
            answer_normalized=str(row.get("answer", "")),
            topic=str(row.get("topic", "")),
            language=language,
        )
        explanation = fetch_explanation_with_retry(
            client, model, prompt, max_tokens, temperature, rpm
        )
        df.at[idx, "explanation"] = explanation

    return df


def main():
    config_path = ROOT / "config.yaml"
    if not config_path.exists():
        print(f"Fichier de configuration introuvable : {config_path}")
        sys.exit(1)

    cfg = load_config(config_path)
    api_key      = cfg["api"]["api_key"]
    input_csv    = ROOT / cfg["preprocessing"]["input_csv"]
    output_csv   = ROOT / cfg["preprocessing"]["output_csv"]
    answer_field = cfg["preprocessing"].get("answer_field", "answer_ET")

    if api_key == "YOUR_API_KEY_HERE":
        print("Erreur : renseignez votre clé OpenAI dans config.yaml (champ api.api_key)")
        sys.exit(1)

    if not input_csv.exists():
        print(f"Fichier source introuvable : {input_csv}")
        sys.exit(1)

    print(f"Chargement de {input_csv}...")
    raw = pd.read_csv(str(input_csv), encoding="utf-8-sig")
    print(f"  {len(raw)} lignes chargées.")

    print("Transformation du format...")
    df = transform(raw, answer_field=answer_field)
    print(f"  {len(df)} questions transformées.")

    print("Filtrage des questions invalides...")
    df = filter_questions(df)
    print(f"  {len(df)} questions retenues.")

    client = OpenAI(api_key=api_key)
    df = add_explanations(df, client, cfg)

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(str(output_csv), index=False, encoding="utf-8-sig")
    print(f"\nFichier sauvegardé : {output_csv}  ({len(df)} lignes)")

    # Aperçu
    pd.set_option("display.max_colwidth", 80)
    print("\nAperçu :")
    print(df[["question_id", "question_type", "answer", "choice_A", "choice_B", "explanation"]].head(3))


if __name__ == "__main__":
    main()
