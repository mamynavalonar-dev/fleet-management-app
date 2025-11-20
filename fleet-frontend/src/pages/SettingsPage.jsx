import React from 'react';
import { Check } from 'lucide-react';

const colors = [
  { name: 'Bleu Roi (Défaut)', value: '#2563eb', class: 'bg-blue-600' },
  { name: 'Vert Émeraude', value: '#059669', class: 'bg-emerald-600' },
  { name: 'Violet Profond', value: '#7c3aed', class: 'bg-violet-600' },
  { name: 'Orange Vif', value: '#ea580c', class: 'bg-orange-600' },
  { name: 'Noir Intense', value: '#1f2937', class: 'bg-gray-800' },
];

const SettingsPage = () => {
  const changeTheme = (colorHex) => {
    // Change la variable CSS globale
    document.documentElement.style.setProperty('--color-primary', colorHex);
    // Sauvegarde dans le navigateur pour la prochaine fois
    localStorage.setItem('themeColor', colorHex);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Paramètres & Personnalisation</h1>
      
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Couleur du Thème</h2>
        <p className="text-gray-500 mb-6">Choisissez la couleur principale de l'interface.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {colors.map((color) => (
            <button
              key={color.value}
              onClick={() => changeTheme(color.value)}
              className={`${color.class} h-20 rounded-xl flex items-center justify-center text-white font-medium shadow-md hover:scale-105 transition-transform`}
            >
              {color.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;