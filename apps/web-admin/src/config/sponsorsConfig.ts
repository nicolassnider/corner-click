import { SponsorConfig } from '@corner-click/types';

export const mockSponsorsConfig: SponsorConfig = {
  principal: {
    id: 'spon-1',
    name: 'KWON',
    tier: 'platinum',
  },
  timerSponsors: [
    { id: 'spon-2', name: 'Adidas', tier: 'gold' },
    { id: 'spon-3', name: 'Nike', tier: 'gold' },
  ],
  redCorner: {
    id: 'spon-4',
    name: 'MANTRA GYM',
    tier: 'silver',
  },
  blueCorner: {
    id: 'spon-5',
    name: 'KICK MASTER APPAREL',
    tier: 'silver',
  },
  watermark: {
    id: 'spon-6',
    name: 'FUJI',
    tier: 'platinum',
  },
  sideBannersLeft: [
    { id: 'spon-7', name: 'FUJI', tier: 'standard' },
    { id: 'spon-8', name: 'Daedo', tier: 'standard' },
    { id: 'spon-9', name: 'Adidas', tier: 'standard' },
    { id: 'spon-10', name: 'TUSAH', tier: 'standard' },
  ],
  sideBannersRight: [
    { id: 'spon-11', name: 'PHOENIX', tier: 'standard' },
    { id: 'spon-12', name: 'SMAI', tier: 'standard' },
    { id: 'spon-13', name: 'Mooto', tier: 'standard' },
    { id: 'spon-14', name: 'TOP TEN', tier: 'standard' },
  ],
  ticker: [
    { id: 'spon-15', name: 'Café MARTINEZ', tier: 'bronze' },
    { id: 'spon-16', name: 'Vea', tier: 'bronze' },
    { id: 'spon-17', name: 'Taller Mecánico Gonzalez', tier: 'bronze' },
    { id: 'spon-18', name: 'Tienda de Deportes Local', tier: 'bronze' },
    { id: 'spon-19', name: 'DirecTV', tier: 'bronze' },
  ],
};
