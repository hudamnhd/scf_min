import { useState } from 'react';

type Skill = {
  name: string;
  value: number;
};

const InputSkills = () => {
  const [skillName, setSkillName] = useState<string>('');
  const [skillValue, setSkillValue] = useState<number>(1); // Memastikan nilai awal adalah 1
  const [skillCategory, setSkillCategory] = useState<'hard' | 'soft'>('hard');
  const [hardSkills, setHardSkills] = useState<Skill[]>([]);
  const [softSkills, setSoftSkills] = useState<Skill[]>([]);

  const handleAddSkill = () => {
    if (skillName.trim() === '') return;

    const newSkill: Skill = {
      name: skillName,
      value: skillValue,
    };

    if (skillCategory === 'hard') {
      setHardSkills([...hardSkills, newSkill]);
    } else {
      setSoftSkills([...softSkills, newSkill]);
    }

    setSkillName('');
    setSkillValue(1); // Reset nilai skillValue ke 1 setelah ditambahkan
  };

  const handleRemoveSkill = (category: 'hard' | 'soft', index: number) => {
    if (category === 'hard') {
      const updatedHardSkills = [...hardSkills];
      updatedHardSkills.splice(index, 1);
      setHardSkills(updatedHardSkills);
    } else {
      const updatedSoftSkills = [...softSkills];
      updatedSoftSkills.splice(index, 1);
      setSoftSkills(updatedSoftSkills);
    }
  };

  const handleSkillValueChange = (value: number) => {
    // Memastikan nilai skillValue berada dalam rentang 1 hingga 100
    if (value >= 1 && value <= 100) {
      setSkillValue(value);
    }
  };

  return (
    <div>
      <div>
        <label>
          Skill Name:
          <input type="text" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          Skill Value:
          <input
            type="number"
            value={skillValue}
            onChange={(e) => handleSkillValueChange(parseInt(e.target.value))}
            min={1}
            max={100} // Mengatur nilai minimal dan maksimal untuk input skillValue
          />
        </label>
      </div>
      <div>
        <label>
          Category:
          <select value={skillCategory} onChange={(e) => setSkillCategory(e.target.value as 'hard' | 'soft')}>
            <option value="hard">Hard Skill</option>
            <option value="soft">Soft Skill</option>
          </select>
        </label>
      </div>
      <button onClick={handleAddSkill}>Add Skill</button>
      <div>
        <h2>Hard Skills:</h2>
        <ul>
          {hardSkills.map((skill, index) => (
            <li key={index}>
              {skill.name} - Value: {skill.value}
              <button onClick={() => handleRemoveSkill('hard', index)}>Remove</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Soft Skills:</h2>
        <ul>
          {softSkills.map((skill, index) => (
            <li key={index}>
              {skill.name} - Value: {skill.value}
              <button onClick={() => handleRemoveSkill('soft', index)}>Remove</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default InputSkills;
