export const universityDomains: Record<string, string> = {
  "mit.edu": "Massachusetts Institute of Technology",
  "harvard.edu": "Harvard University",
  "stanford.edu": "Stanford University",
  "berkeley.edu": "University of California, Berkeley",
  "ox.ac.uk": "Oxford University",
  "cam.ac.uk": "University of Cambridge",
  "nus.edu.sg": "National University of Singapore",
  "ucl.ac.uk": "University College London",
  "imperial.ac.uk": "Imperial College London",
  "ethz.ch": "ETH Zurich",
  "utoronto.ca": "University of Toronto",
  "unimelb.edu.au": "University of Melbourne",
};

export function getUniversityByEmail(email: string): string | null {
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  return universityDomains[domain] || null;
}
