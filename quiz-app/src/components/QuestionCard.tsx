import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Question } from '../types';

interface Props {
  question: Question;
  onValidate: (selected: string[]) => void;
}

export default function QuestionCard({ question, onValidate }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (label: string) => {
    if (question.question_type === 'single') {
      setSelected([label]);
    } else {
      setSelected((prev) =>
        prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
      );
    }
  };

  const handleValidate = () => {
    if (selected.length > 0) onValidate(selected);
  };

  return (
    <View style={styles.card}>
      {!!question.topic && <Text style={styles.topic}>{question.topic}</Text>}

      <Text style={styles.question}>{question.question_text}</Text>

      <Text style={styles.hint}>
        {question.question_type === 'multiple'
          ? 'Plusieurs réponses attendues'
          : 'Une seule réponse'}
      </Text>

      {question.choices.map((c) => {
        const active = selected.includes(c.label);
        return (
          <TouchableOpacity
            key={c.label}
            style={[styles.choice, active && styles.choiceActive]}
            onPress={() => toggle(c.label)}
            activeOpacity={0.75}
          >
            <View style={[styles.badge, active && styles.badgeActive]}>
              <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                {c.label}
              </Text>
            </View>
            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
              {c.text}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.btn, !selected.length && styles.btnDisabled]}
        onPress={handleValidate}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>Valider</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e2a38',
    borderRadius: 16,
    padding: 20,
  },
  topic: {
    color: '#5d8aaa',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  question: {
    color: '#ecf0f1',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
  hint: {
    color: '#7f8c8d',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#273849',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  choiceActive: {
    borderColor: '#3498db',
    backgroundColor: '#1a3a52',
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34495e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  badgeActive: {
    backgroundColor: '#3498db',
  },
  badgeText: {
    color: '#bdc3c7',
    fontWeight: 'bold',
    fontSize: 13,
  },
  badgeTextActive: {
    color: '#fff',
  },
  choiceText: {
    color: '#bdc3c7',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  choiceTextActive: {
    color: '#ecf0f1',
  },
  btn: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    backgroundColor: '#2c3e50',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
