/**
 * Known university/institution email domains mapped to their display names.
 *
 * UK coverage: most .ac.uk domains are auto-approved by the isAcUkDomain()
 * check in emailValidation.ts. The entries here provide friendly name
 * resolution for the auto-fill feature.
 *
 * Global coverage: a representative set of well-known institutions.
 * Add more entries as needed.
 */
export const universityDomains: Record<string, string> = {
  // ── United Kingdom ───────────────────────────────────────────────────────
  // Russell Group
  "ox.ac.uk": "University of Oxford",
  "cam.ac.uk": "University of Cambridge",
  "ucl.ac.uk": "University College London",
  "imperial.ac.uk": "Imperial College London",
  "lse.ac.uk": "London School of Economics",
  "kcl.ac.uk": "King's College London",
  "ed.ac.uk": "University of Edinburgh",
  "manchester.ac.uk": "University of Manchester",
  "bristol.ac.uk": "University of Bristol",
  "warwick.ac.uk": "University of Warwick",
  "leeds.ac.uk": "University of Leeds",
  "sheffield.ac.uk": "University of Sheffield",
  "nottingham.ac.uk": "University of Nottingham",
  "birmingham.ac.uk": "University of Birmingham",
  "soton.ac.uk": "University of Southampton",
  "qmul.ac.uk": "Queen Mary University of London",
  "glasgow.ac.uk": "University of Glasgow",
  "bris.ac.uk": "University of Bristol",
  "durham.ac.uk": "Durham University",
  "exeter.ac.uk": "University of Exeter",
  "york.ac.uk": "University of York",
  "reading.ac.uk": "University of Reading",
  "bath.ac.uk": "University of Bath",
  "cardiff.ac.uk": "Cardiff University",
  "qub.ac.uk": "Queen's University Belfast",
  "st-andrews.ac.uk": "University of St Andrews",
  "abdn.ac.uk": "University of Aberdeen",
  // Post-92 / Modern universities
  "wlv.ac.uk": "University of Wolverhampton",
  "bcu.ac.uk": "Birmingham City University",
  "uel.ac.uk": "University of East London",
  "lbu.ac.uk": "Leeds Beckett University",
  "shu.ac.uk": "Sheffield Hallam University",
  "mmu.ac.uk": "Manchester Metropolitan University",
  "coventry.ac.uk": "Coventry University",
  "dmu.ac.uk": "De Montfort University",
  "northumbria.ac.uk": "Northumbria University",
  "uwe.ac.uk": "University of the West of England",
  "brighton.ac.uk": "University of Brighton",
  "port.ac.uk": "University of Portsmouth",
  "plymouth.ac.uk": "University of Plymouth",
  "lsbu.ac.uk": "London South Bank University",
  "westminster.ac.uk": "University of Westminster",
  "mdx.ac.uk": "Middlesex University",
  "gre.ac.uk": "University of Greenwich",
  "open.ac.uk": "The Open University",
  "keele.ac.uk": "Keele University",
  "essex.ac.uk": "University of Essex",
  "lincoln.ac.uk": "University of Lincoln",
  "anglia.ac.uk": "Anglia Ruskin University",
  "herts.ac.uk": "University of Hertfordshire",
  "beds.ac.uk": "University of Bedfordshire",
  "staffordshire.ac.uk": "Staffordshire University",
  "bolton.ac.uk": "University of Bolton",
  "derby.ac.uk": "University of Derby",
  "hull.ac.uk": "University of Hull",
  "sunderland.ac.uk": "University of Sunderland",
  "teesside.ac.uk": "Teesside University",
  "tvu.ac.uk": "Thames Valley University",
  "napier.ac.uk": "Edinburgh Napier University",
  "uws.ac.uk": "University of the West of Scotland",
  "gla.ac.uk": "University of Glasgow",
  "stir.ac.uk": "University of Stirling",
  "dundee.ac.uk": "University of Dundee",
  "hw.ac.uk": "Heriot-Watt University",
  "rgu.ac.uk": "Robert Gordon University",
  "bangor.ac.uk": "Bangor University",
  "swansea.ac.uk": "Swansea University",
  "aber.ac.uk": "Aberystwyth University",
  "uniarts.ac.uk": "University of the Arts London",
  "rca.ac.uk": "Royal College of Art",
  "gold.ac.uk": "Goldsmiths, University of London",
  "rhul.ac.uk": "Royal Holloway, University of London",
  "bbk.ac.uk": "Birkbeck, University of London",
  "city.ac.uk": "City, University of London",
  "surrey.ac.uk": "University of Surrey",
  "sussex.ac.uk": "University of Sussex",
  "kent.ac.uk": "University of Kent",
  "cranfield.ac.uk": "Cranfield University",
  "loughborough.ac.uk": "Loughborough University",
  "aston.ac.uk": "Aston University",
  "leicester.ac.uk": "University of Leicester",
  "lancaster.ac.uk": "Lancaster University",
  "uea.ac.uk": "University of East Anglia",
  "salford.ac.uk": "University of Salford",
  "ulster.ac.uk": "Ulster University",
  "brunel.ac.uk": "Brunel University London",
  "kingston.ac.uk": "Kingston University",
  "roehampton.ac.uk": "University of Roehampton",
  "chi.ac.uk": "University of Chichester",
  "winchester.ac.uk": "University of Winchester",
  "worcester.ac.uk": "University of Worcester",
  "newman.ac.uk": "Newman University",
  "solent.ac.uk": "Solent University",
  "uos.ac.uk": "University of Suffolk",
  "ntu.ac.uk": "Nottingham Trent University",
  "glyndwr.ac.uk": "Wrexham Glyndŵr University",

  // ── United States ────────────────────────────────────────────────────────
  "mit.edu": "Massachusetts Institute of Technology",
  "harvard.edu": "Harvard University",
  "stanford.edu": "Stanford University",
  "berkeley.edu": "University of California, Berkeley",
  "ucla.edu": "University of California, Los Angeles",
  "columbia.edu": "Columbia University",
  "cornell.edu": "Cornell University",
  "yale.edu": "Yale University",
  "princeton.edu": "Princeton University",
  "upenn.edu": "University of Pennsylvania",
  "caltech.edu": "California Institute of Technology",
  "uchicago.edu": "University of Chicago",
  "duke.edu": "Duke University",
  "northwestern.edu": "Northwestern University",
  "nyu.edu": "New York University",
  "jhu.edu": "Johns Hopkins University",
  "dartmouth.edu": "Dartmouth College",
  "brown.edu": "Brown University",
  "tufts.edu": "Tufts University",
  "bu.edu": "Boston University",
  "northeastern.edu": "Northeastern University",
  "umich.edu": "University of Michigan",
  "gatech.edu": "Georgia Institute of Technology",
  "usc.edu": "University of Southern California",
  "purdue.edu": "Purdue University",
  "psu.edu": "Pennsylvania State University",
  "osu.edu": "Ohio State University",
  "unc.edu": "University of North Carolina",
  "utexas.edu": "University of Texas at Austin",
  "virginia.edu": "University of Virginia",
  "wustl.edu": "Washington University in St. Louis",

  // ── Canada ───────────────────────────────────────────────────────────────
  "utoronto.ca": "University of Toronto",
  "ubc.ca": "University of British Columbia",
  "mcgill.ca": "McGill University",
  "queensu.ca": "Queen's University",
  "uwaterloo.ca": "University of Waterloo",
  "ualberta.ca": "University of Alberta",
  "dal.ca": "Dalhousie University",
  "sfu.ca": "Simon Fraser University",
  "mcmaster.ca": "McMaster University",
  "uottawa.ca": "University of Ottawa",

  // ── Australia ────────────────────────────────────────────────────────────
  "unimelb.edu.au": "University of Melbourne",
  "anu.edu.au": "Australian National University",
  "sydney.edu.au": "University of Sydney",
  "unsw.edu.au": "University of New South Wales",
  "uq.edu.au": "University of Queensland",
  "monash.edu": "Monash University",
  "adelaide.edu.au": "University of Adelaide",
  "uwa.edu.au": "University of Western Australia",
  "qut.edu.au": "Queensland University of Technology",
  "rmit.edu.au": "RMIT University",

  // ── Europe ───────────────────────────────────────────────────────────────
  "ethz.ch": "ETH Zurich",
  "epfl.ch": "École Polytechnique Fédérale de Lausanne",
  "tum.de": "Technical University of Munich",
  "lmu.de": "Ludwig Maximilian University of Munich",
  "hu-berlin.de": "Humboldt University of Berlin",
  "kit.edu": "Karlsruhe Institute of Technology",
  "sorbonne-universite.fr": "Sorbonne University",
  "polytechnique.edu": "École Polytechnique",
  "kuleuven.be": "KU Leuven",
  "ugent.be": "Ghent University",
  "uva.nl": "University of Amsterdam",
  "tudelft.nl": "Delft University of Technology",
  "uu.nl": "Utrecht University",
  "ku.dk": "University of Copenhagen",
  "chalmers.se": "Chalmers University of Technology",
  "kth.se": "KTH Royal Institute of Technology",
  "lu.se": "Lund University",
  "uu.se": "Uppsala University",
  "aalto.fi": "Aalto University",
  "unipi.it": "University of Pisa",
  "unibo.it": "University of Bologna",
  "uam.es": "Autonomous University of Madrid",

  // ── Asia ─────────────────────────────────────────────────────────────────
  "nus.edu.sg": "National University of Singapore",
  "ntu.edu.sg": "Nanyang Technological University",
  "tsinghua.edu.cn": "Tsinghua University",
  "pku.edu.cn": "Peking University",
  "iitb.ac.in": "IIT Bombay",
  "iitd.ac.in": "IIT Delhi",
  "iitm.ac.in": "IIT Madras",
  "iisc.ac.in": "Indian Institute of Science",
  "u-tokyo.ac.jp": "University of Tokyo",
  "kyoto-u.ac.jp": "Kyoto University",
  "hku.hk": "University of Hong Kong",
  "cuhk.edu.hk": "Chinese University of Hong Kong",
};

/**
 * Returns the university name for a given email address, or null if unknown.
 * Also handles the .ac.uk wildcard — any .ac.uk domain that isn't explicitly
 * mapped returns a generic "UK Academic Institution" label.
 */
export function getUniversityByEmail(email: string): string | null {
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return null;

  if (universityDomains[domain]) {
    return universityDomains[domain];
  }

  // Generic fallback for .ac.uk domains not individually listed
  if (domain.endsWith(".ac.uk")) {
    return "UK Academic Institution";
  }

  return null;
}
