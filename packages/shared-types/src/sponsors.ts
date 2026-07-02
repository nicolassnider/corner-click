export interface Sponsor {
  id: string
  name: string
  logoUrl?: string // URL to the sponsor's logo image
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze' | 'standard'
  // Extra fields that could be useful later
  url?: string
}

export interface CornerSponsor extends Sponsor {
  corner: 'red' | 'blue'
}

export interface SponsorConfig {
  principal?: Sponsor // Top right next to Area
  timerSponsors?: Sponsor[] // Above the timer
  redCorner?: Sponsor // Presented by for red
  blueCorner?: Sponsor // Presented by for blue
  watermark?: Sponsor // Central watermark when paused
  sideBannersLeft?: Sponsor[] // Left banners in waiting state
  sideBannersRight?: Sponsor[] // Right banners in waiting state
  ticker?: Sponsor[] // Bottom carousel
}
