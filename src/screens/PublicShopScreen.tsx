import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export const PublicShopScreen: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [menu, setMenu] = useState<any>(null);

  useEffect(() => {
    // In a real app, we'd query menus by slug
    // For now, mock the menu load
    console.log("Loading menu for slug:", slug);
  }, [slug]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Shop: {slug}</h1>
      <p>Public Menu (Read-only)</p>
    </div>
  );
};
