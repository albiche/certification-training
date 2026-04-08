import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  totalQuestions: number;
  onReset: () => void;
}

export default function VictoryScreen({ totalQuestions, onReset }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.trophy}>🏆</Text>
      <Text style={styles.title}>Bravo !</Text>
      <Text style={styles.subtitle}>
        Les {totalQuestions} questions sont maîtrisées.
      </Text>
      <Text style={styles.note}>
        Dans 5 jours, une régression automatique relancera la révision pour consolider vos acquis.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onReset} activeOpacity={0.8}>
        <Text style={styles.btnText}>Tout recommencer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  trophy: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    color: '#f1c40f',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  subtitle: {
    color: '#ecf0f1',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 18,
  },
  note: {
    color: '#7f8c8d',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  btn: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 36,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
