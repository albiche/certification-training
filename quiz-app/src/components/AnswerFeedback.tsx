import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Question } from '../types';

interface Props {
  question: Question;
  selectedAnswers: string[];
  isCorrect: boolean;
  onNext: () => void;
}

export default function AnswerFeedback({
  question,
  isCorrect,
  onNext,
}: Props) {
  return (
    <View style={[styles.container, isCorrect ? styles.correctBorder : styles.incorrectBorder]}>
      {/* Résultat */}
      <Text style={[styles.verdict, isCorrect ? styles.verdictCorrect : styles.verdictIncorrect]}>
        {isCorrect ? '✓  Bonne réponse !' : '✗  Mauvaise réponse'}
      </Text>

      {/* Réponse correcte */}
      <View style={styles.section}>
        <Text style={styles.label}>Réponse correcte :</Text>
        {question.correct_answers.map((lbl) => {
          const choice = question.choices.find((c) => c.label === lbl);
          return (
            <Text key={lbl} style={styles.correctAnswer}>
              {lbl}. {choice ? choice.text : lbl}
            </Text>
          );
        })}
      </View>

      {/* Explication */}
      {!!question.explanation && (
        <View style={styles.section}>
          <Text style={styles.label}>Explication :</Text>
          <Text style={styles.explanation}>{question.explanation}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.nextBtn} onPress={onNext} activeOpacity={0.8}>
        <Text style={styles.nextText}>Suivant →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  correctBorder: {
    backgroundColor: '#132a1e',
    borderColor: '#2ecc71',
  },
  incorrectBorder: {
    backgroundColor: '#2a1313',
    borderColor: '#e74c3c',
  },
  verdict: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  verdictCorrect: {
    color: '#2ecc71',
  },
  verdictIncorrect: {
    color: '#e74c3c',
  },
  section: {
    marginBottom: 14,
  },
  label: {
    color: '#7f8c8d',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  correctAnswer: {
    color: '#2ecc71',
    fontSize: 16,
    fontWeight: '600',
  },
  explanation: {
    color: '#cdd9e0',
    fontSize: 14,
    lineHeight: 22,
  },
  nextBtn: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  nextText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
