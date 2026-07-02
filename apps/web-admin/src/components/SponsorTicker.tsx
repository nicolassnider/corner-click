import { Sponsor } from '@corner-click/types';
import { motion } from 'framer-motion';

interface SponsorTickerProps {
  sponsors: Sponsor[];
  speed?: number; // Speed in pixels per second
}

export function SponsorTicker({ sponsors, speed = 50 }: SponsorTickerProps) {
  if (!sponsors || sponsors.length === 0) return null;

  // Duplicate sponsors a few times to ensure seamless scrolling
  const duplicatedSponsors = [...sponsors, ...sponsors, ...sponsors, ...sponsors];
  
  // Calculate duration based on the assumed width. 
  // For a pure CSS/Framer motion marquee, we animate from 0 to -50% (since we duplicated)
  // A standard way is to animate x from 0% to -50% or -100%.
  
  return (
    <div className="w-full bg-slate-900 border-t border-slate-800/60 overflow-hidden flex items-center relative py-[1vh]">
      <div className="absolute left-0 top-0 bottom-0 w-[5vw] bg-gradient-to-r from-slate-900 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-[5vw] bg-gradient-to-l from-slate-900 to-transparent z-10" />
      
      {/* 
        We use a simple trick: animate x from 0 to -50%.
        We need enough duplicated content so that 50% is wider than the screen.
      */}
      <motion.div
        className="flex gap-[4vw] whitespace-nowrap items-center min-w-max"
        animate={{ x: [0, '-50%'] }}
        transition={{
          repeat: Infinity,
          ease: 'linear',
          duration: (sponsors.length * 200) / speed, // Dynamic duration based on item count and speed
        }}
      >
        {duplicatedSponsors.map((sponsor, idx) => (
          <div key={`${sponsor.id}-${idx}`} className="flex items-center gap-[1vw]">
            {/* If we had logos, we'd render an img tag here */}
            {sponsor.logoUrl ? (
              <img src={sponsor.logoUrl} alt={sponsor.name} className="h-[3vh] object-contain" />
            ) : (
              <div className="bg-slate-800 rounded-full h-[3vh] w-[3vh] flex items-center justify-center text-[1.5vh] text-slate-400 font-bold">
                {sponsor.name.charAt(0)}
              </div>
            )}
            <span className="text-slate-400 font-bold tracking-widest uppercase text-[1.8vh]">
              {sponsor.name}
            </span>
            {sponsor.tier !== 'standard' && (
              <span className="text-[1.2vh] uppercase text-amber-500/80 border border-amber-500/30 px-[0.5vw] py-[0.2vh] rounded ml-[0.5vw]">
                {sponsor.tier}
              </span>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
