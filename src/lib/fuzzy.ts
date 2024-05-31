function levDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Calculate Levenshtein distance
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function fuzzySearch(query, targets, threshold) {
  const results = [];

  for (const target of targets) {
    const categoryDistance = levDistance(
      query.category.toString(),
      target.category.toString(),
    );
    const codeDistance = levDistance(
      query.code.toLowerCase(),
      target.code.toLowerCase(),
    );
    const totalDistance = categoryDistance + codeDistance;

    if (totalDistance <= threshold) {
      results.push({ ...target, score: totalDistance });
    }
  }

  return results;
}

// prettier-ignore

export function adjustScores(
  _resultFuzzy,
  softSkillsScore,
  hardSkillsScore,
  totalGrade,
  addtPerc,
) {

  // prettier-ignore
   function calculateImpact(quality, additionalImpactPercentage) {
    if (quality >= 1 && quality <= 2.5) {
        return 0.5 * additionalImpactPercentage; // Efek negatif 40% untuk nilai rendah
    } else if (quality > 2.5 && quality <= 5) {
        return 0.25 * additionalImpactPercentage; // Efek negatif 20% untuk nilai sedang
    } else if (quality > 5 && quality <= 7.5) {
        return -0.25 * additionalImpactPercentage; // Efek positif 20% untuk nilai sedang
    } else if (quality > 7.5 && quality <= 10) {
        return -0.5 * additionalImpactPercentage; // Efek positif 40% untuk nilai tinggi
    } else {
        return 0; // Kembalikan dampak default atau atasi nilai di luar rentang secara sesuai
    }
}

  const additionalImpactPercentage = totalGrade * addtPerc;
  _resultFuzzy.forEach((item) => {
    const softSkillsImpact = calculateImpact(
      softSkillsScore,
      additionalImpactPercentage,
    );
    const hardSkillsImpact = calculateImpact(
      hardSkillsScore,
      additionalImpactPercentage,
    );

    const totalAddt = softSkillsImpact + hardSkillsImpact;

    item.score += totalAddt;
    item.score = parseFloat(item.score.toFixed(2));

    if (item.score < 0) {
      item.score = 0.3;
    }
  });

  return _resultFuzzy;
}

// prettier-ignore
export function konversiNilai(nilai) {
  if (nilai >= 5) {
    return "C";
  } else if (nilai >= 4) {
    return "C+";
  } else if (nilai >= 3) {
    return "B";
  } else if (nilai >= 2) {
    return "B+";
  } else {
    return "A";
  }
}
