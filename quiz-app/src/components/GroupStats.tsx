import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Group } from '../types';

const COLORS: Record<Group, string> = {
  1: '#e74c3c',
  2: '#e67e22',
  3: '#3498db',
  4: '#2ecc71',
};


interface Props {
  counts: Record<Group, number>;
  answered: number;
  total: number;
}

export default function GroupStats({ counts, answered, total }: Props) {
  const totalQ = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);
  const remaining = answered - total;
  const remainingColor = remaining < 0 ? '#e74c3c' : '#2ecc71';
  const remainingText = remaining >= 0 ? `+${remaining}` : `${remaining}`;

  return (
    <View style={s.container}>
      {/* Barre proportionnelle */}
      <View style={s.bar}>
        {([1, 2, 3, 4] as Group[]).map((g, i) => {
          const pct = totalQ > 0 ? (counts[g] / totalQ) * 100 : 25;
          if (counts[g] === 0) return null;
          return (
            <View
              key={g}
              style={[
                s.segment,
                { backgroundColor: COLORS[g], flex: pct },
                i === 0 && s.segmentFirst,
                i === 3 && s.segmentLast,
              ]}
            />
          );
        })}
      </View>

      {/* Chips enchaînées + compteur */}
      <View style={s.row}>
        <View style={s.chips}>
          {([1, 2, 3, 4] as Group[]).map((g, i) => (
            <React.Fragment key={g}>
              <View style={[s.chip, { borderColor: COLORS[g] }]}>
                <Text style={[s.chipCount, { color: COLORS[g] }]}>{counts[g]}</Text>
              </View>
              {i < 3 && <Text style={s.arrow}>»</Text>}
            </React.Fragment>
          ))}
        </View>
        <View style={s.remainingBox}>
          <Text style={[s.remainingValue, { color: remainingColor }]}>{remainingText}</Text>
          <Text style={s.remainingLabel}>/ reset</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#1e2a38',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 16,
    gap: 12,
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#273849',
  },
  segment: {
    height: 6,
  },
  segmentFirst: {
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  segmentLast: {
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remainingBox: {
    alignItems: 'center',
  },
  remainingValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  remainingLabel: {
    color: '#5d7a8a',
    fontSize: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  chipCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  arrow: {
    color: '#5d7a8a',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
