'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { createPet } from '@/lib/firestore/pets';
import { uploadPetImage, dataURLtoFile } from '@/lib/storage/images';
import { PetInfo } from '@/types/pet';

interface PetFormData {
  photos: string[];
  petInfo: {
    name: string;
    type: string;
    breed: string;
    age: string;
    size: string;
    colors: string[];
    specialFeatures: string;
    microchipId: string;
  };
  lastSeen: {
    location: string;
    date: string;
    time: string;
    circumstances: string;
  };
  contactInfo: {
    name: string;
    phone: string;
    email: string;
    alternativeContact: string;
  };
}

const initialFormData: PetFormData = {
  photos: [],
  petInfo: {
    name: '',
    type: '',
    breed: '',
    age: '',
    size: '',
    colors: [],
    specialFeatures: '',
    microchipId: ''
  },
  lastSeen: {
    location: '',
    date: '',
    time: '',
    circumstances: ''
  },
  contactInfo: {
    name: '',
    phone: '',
    email: '',
    alternativeContact: ''
  }
};

export function usePetForm() {
  const [formData, setFormData] = useState<PetFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const updateFormData = (section: keyof PetFormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: data
    }));
  };

  const submitPet = async (): Promise<string | null> => {
    if (!user) {
      throw new Error('User must be logged in to submit pet');
    }

    setIsSubmitting(true);
    
    try {
      const petData: Omit<PetInfo, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
        name: formData.petInfo.name,
        type: formData.petInfo.type,
        breed: formData.petInfo.breed,
        age: formData.petInfo.age,
        size: formData.petInfo.size,
        colors: formData.petInfo.colors,
        specialFeatures: formData.petInfo.specialFeatures,
        microchipId: formData.petInfo.microchipId,
        images: [],
        lastSeen: formData.lastSeen,
        contactInfo: {
          name: formData.contactInfo.name,
          phone: formData.contactInfo.phone,
          email: formData.contactInfo.email,
          alternativeContact: formData.contactInfo.alternativeContact
        },
        status: 'missing'
      };

      const petId = await createPet(petData);

      if (formData.photos.length > 0) {
        const imageUrls: string[] = [];
        
        for (let i = 0; i < formData.photos.length; i++) {
          const dataUrl = formData.photos[i];
          const file = dataURLtoFile(dataUrl, `pet_image_${i}.jpg`);
          const imageUrl = await uploadPetImage(file, user.uid, petId, i);
          imageUrls.push(imageUrl);
        }

        await import('@/lib/firestore/pets').then(({ updatePet }) =>
          updatePet(petId, { images: imageUrls })
        );
      }

      setFormData(initialFormData);
      return petId;
    } catch (error) {
      console.error('Error submitting pet:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    updateFormData,
    submitPet,
    isSubmitting,
    resetForm: () => setFormData(initialFormData)
  };
}