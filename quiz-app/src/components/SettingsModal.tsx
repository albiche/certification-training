import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';

interface Props {
  visible: boolean;
  regressionDays: number;
  totalQuestions: number;
  onClose: () => void;
  onReset: () => void;
  onSaveDays: (days: number) => void;
}

export default function SettingsModal({
  visible,
  regressionDays,
  totalQuestions,
  onClose,
  onReset,
  onSaveDays,
}: Props) {
  const [days, setDays] = useState(regressionDays);

  const minPerDay = days > 0 ? Math.ceil(totalQuestions / days) : totalQuestions;

  const handleSave = () => {
    onSaveDays(days);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={s.header}>
              <Text style={s.title}>Paramètres</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.close}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Probas */}
            <Text style={s.sectionTitle}>Probabilités de sélection</Text>
            <View style={s.card}>
              {[
                { g: 1, pct: '90%', color: '#e74c3c' },
                { g: 2, pct: '9%',  color: '#e67e22' },
                { g: 3, pct: '1%',  color: '#f1c40f' },
                { g: 4, pct: '0%',  color: '#2ecc71' },
              ].map(({ g, pct, color }) => (
                <View key={g} style={s.probaRow}>
                  <View style={[s.dot, { backgroundColor: color }]} />
                  <Text style={s.probaLabel}>Groupe {g}</Text>
                  <Text style={s.probaValue}>{pct}</Text>
                </View>
              ))}
              <Text style={s.probaNote}>
                Si un groupe est vide, les probabilités se normalisent automatiquement.
              </Text>
            </View>

            {/* Slider régression */}
            <Text style={s.sectionTitle}>Intervalle de régression</Text>
            <View style={s.card}>
              <Text style={s.sliderValue}>{days} jour{days > 1 ? 's' : ''}</Text>
              <Slider
                style={s.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={days}
                onValueChange={setDays}
                minimumTrackTintColor="#3498db"
                maximumTrackTintColor="#34495e"
                thumbTintColor="#3498db"
              />
              <View style={s.sliderLabels}>
                <Text style={s.sliderEdge}>1 j</Text>
                <Text style={s.sliderEdge}>10 j</Text>
              </View>
              <View style={s.rhythmBox}>
                <Text style={s.rhythmText}>
                  Minimum pour tenir le rythme :
                </Text>
                <Text style={s.rhythmValue}>
                  {minPerDay} question{minPerDay > 1 ? 's' : ''} / jour
                </Text>
                <Text style={s.rhythmSub}>
                  ({totalQuestions} questions ÷ {days} jour{days > 1 ? 's' : ''})
                </Text>
              </View>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>Appliquer</Text>
              </TouchableOpacity>
            </View>

            {/* Reset */}
            <Text style={s.sectionTitle}>Réinitialisation</Text>
            <View style={s.card}>
              <Text style={s.resetDesc}>
                Remet toutes les questions au groupe 1 et réinitialise le timer de régression.
              </Text>
              <TouchableOpacity style={s.resetBtn} onPress={onReset}>
                <Text style={s.resetBtnText}>Remettre à zéro</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f1923',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#ecf0f1',
    fontSize: 20,
    fontWeight: 'bold',
  },
  close: {
    color: '#7f8c8d',
    fontSize: 18,
  },
  sectionTitle: {
    color: '#7f8c8d',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e2a38',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  probaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  probaLabel: {
    color: '#bdc3c7',
    flex: 1,
    fontSize: 14,
  },
  probaValue: {
    color: '#ecf0f1',
    fontWeight: 'bold',
    fontSize: 14,
  },
  probaNote: {
    color: '#5d6d7e',
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  sliderValue: {
    color: '#3498db',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
    marginBottom: 12,
  },
  sliderEdge: {
    color: '#5d6d7e',
    fontSize: 11,
  },
  rhythmBox: {
    backgroundColor: '#273849',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  rhythmText: {
    color: '#7f8c8d',
    fontSize: 12,
    marginBottom: 4,
  },
  rhythmValue: {
    color: '#e67e22',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rhythmSub: {
    color: '#5d6d7e',
    fontSize: 11,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  resetDesc: {
    color: '#7f8c8d',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  resetBtn: {
    backgroundColor: '#2a1313',
    borderWidth: 1,
    borderColor: '#e74c3c',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
