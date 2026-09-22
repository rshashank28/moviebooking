import { create } from 'zustand';

export const CITIES = [
  { id: 'patna', name: 'Patna', state: 'Bihar', isPopular: true },
  { id: 'delhi-ncr', name: 'Delhi-NCR', state: 'Delhi', isPopular: true },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', isPopular: true },
  { id: 'bangalore', name: 'Bengaluru', state: 'Karnataka', isPopular: true },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', isPopular: true },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', isPopular: true },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', isPopular: true },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', isPopular: true },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', isPopular: false },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', isPopular: false },
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', isPopular: false },
  { id: 'chandigarh', name: 'Chandigarh', state: 'Punjab', isPopular: false },
];

export const useCityStore = create((set) => ({
  selectedCity: JSON.parse(localStorage.getItem('showpulse_city')) || CITIES[0],
  isModalOpen: false,

  setCity: (city) => {
    localStorage.setItem('showpulse_city', JSON.stringify(city));
    set({ selectedCity: city, isModalOpen: false });
  },

  setModalOpen: (open) => set({ isModalOpen: open }),
}));
