import { db } from "../../db";
import { universities, majors } from "@shared/schema";

export async function seedUniversities() {
  const universityData = [
    { name: "Massachusetts Institute of Technology", location: "Cambridge, MA" },
    { name: "Stanford University", location: "Stanford, CA" },
    { name: "Harvard University", location: "Cambridge, MA" },
    { name: "California Institute of Technology", location: "Pasadena, CA" },
    { name: "University of Cambridge", location: "Cambridge, UK" },
    { name: "University of Oxford", location: "Oxford, UK" },
    { name: "University of California, Berkeley", location: "Berkeley, CA" },
    { name: "University of Chicago", location: "Chicago, IL" },
    { name: "Princeton University", location: "Princeton, NJ" },
    { name: "Yale University", location: "New Haven, CT" },
    { name: "Columbia University", location: "New York, NY" },
    { name: "University of Pennsylvania", location: "Philadelphia, PA" },
    { name: "Northwestern University", location: "Evanston, IL" },
    { name: "Duke University", location: "Durham, NC" },
    { name: "University of Michigan", location: "Ann Arbor, MI" },
    { name: "University of Toronto", location: "Toronto, ON" },
    { name: "University of British Columbia", location: "Vancouver, BC" },
    { name: "Imperial College London", location: "London, UK" },
    { name: "ETH Zurich", location: "Zurich, Switzerland" },
    { name: "University of Tokyo", location: "Tokyo, Japan" },
    { name: "National University of Singapore", location: "Singapore" },
    { name: "University of Melbourne", location: "Melbourne, Australia" },
    { name: "University of Sydney", location: "Sydney, Australia" },
    { name: "TechNerd Academy", location: "Virtual" },
  ];

  try {
    // Clear existing universities
    await db.delete(universities);

    // Insert universities
    const insertedUniversities = await db
      .insert(universities)
      .values(universityData)
      .returning();

    console.log(`✓ Seeded ${insertedUniversities.length} universities`);
    return insertedUniversities;
  } catch (error: any) {
    console.error("Error seeding universities:", error.message);
    return [];
  }
}

export async function seedMajors() {
  const majorData = [
    // STEM Fields
    { name: "Computer Science", category: "STEM" },
    { name: "Computer Engineering", category: "STEM" },
    { name: "Software Engineering", category: "STEM" },
    { name: "Information Technology", category: "STEM" },
    { name: "Cybersecurity", category: "STEM" },
    { name: "Data Science", category: "STEM" },
    { name: "Artificial Intelligence", category: "STEM" },
    { name: "Machine Learning", category: "STEM" },
    { name: "Web Development", category: "STEM" },
    { name: "Mobile Development", category: "STEM" },
    { name: "Game Development", category: "STEM" },
    { name: "Mathematics", category: "STEM" },
    { name: "Physics", category: "STEM" },
    { name: "Chemistry", category: "STEM" },
    { name: "Biology", category: "STEM" },
    { name: "Biomedical Engineering", category: "STEM" },
    { name: "Electrical Engineering", category: "STEM" },
    { name: "Mechanical Engineering", category: "STEM" },
    { name: "Civil Engineering", category: "STEM" },
    { name: "Aerospace Engineering", category: "STEM" },
    { name: "Chemical Engineering", category: "STEM" },

    // Business & Economics
    { name: "Business Administration", category: "Business" },
    { name: "Finance", category: "Business" },
    { name: "Accounting", category: "Business" },
    { name: "Economics", category: "Business" },
    { name: "Marketing", category: "Business" },
    { name: "Management", category: "Business" },
    { name: "Entrepreneurship", category: "Business" },
    { name: "Supply Chain Management", category: "Business" },
    { name: "Human Resources", category: "Business" },
    { name: "International Business", category: "Business" },

    // Humanities & Social Sciences
    { name: "Psychology", category: "Social Sciences" },
    { name: "Sociology", category: "Social Sciences" },
    { name: "Political Science", category: "Social Sciences" },
    { name: "History", category: "Humanities" },
    { name: "Philosophy", category: "Humanities" },
    { name: "English Literature", category: "Humanities" },
    { name: "Journalism", category: "Humanities" },
    { name: "Communication", category: "Humanities" },
    { name: "Anthropology", category: "Social Sciences" },
    { name: "Geography", category: "Social Sciences" },

    // Law & Government
    { name: "Law", category: "Law" },
    { name: "International Relations", category: "Law" },
    { name: "Public Policy", category: "Law" },
    { name: "Criminology", category: "Law" },

    // Health & Medicine
    { name: "Medicine", category: "Health" },
    { name: "Nursing", category: "Health" },
    { name: "Pharmacy", category: "Health" },
    { name: "Dentistry", category: "Health" },
    { name: "Public Health", category: "Health" },
    { name: "Physical Therapy", category: "Health" },
    { name: "Psychology", category: "Health" },
    { name: "Veterinary Science", category: "Health" },

    // Education
    { name: "Education", category: "Education" },
    { name: "Secondary Education", category: "Education" },
    { name: "Early Childhood Education", category: "Education" },
    { name: "Special Education", category: "Education" },

    // Arts & Design
    { name: "Fine Arts", category: "Arts" },
    { name: "Graphic Design", category: "Arts" },
    { name: "Product Design", category: "Arts" },
    { name: "User Experience Design", category: "Arts" },
    { name: "Music", category: "Arts" },
    { name: "Theater", category: "Arts" },
    { name: "Film Studies", category: "Arts" },
    { name: "Architecture", category: "Arts" },

    // Environmental & Agriculture
    { name: "Environmental Science", category: "Environmental" },
    { name: "Environmental Engineering", category: "Environmental" },
    { name: "Sustainability", category: "Environmental" },
    { name: "Agriculture", category: "Environmental" },
    { name: "Forestry", category: "Environmental" },

    // Other
    { name: "General Studies", category: "Other" },
    { name: "Liberal Arts", category: "Other" },
    { name: "Undeclared", category: "Other" },
  ];

  try {
    // Clear existing majors
    await db.delete(majors);

    // Insert majors
    const insertedMajors = await db
      .insert(majors)
      .values(majorData)
      .returning();

    console.log(`✓ Seeded ${insertedMajors.length} majors`);
    return insertedMajors;
  } catch (error: any) {
    console.error("Error seeding majors:", error.message);
    return [];
  }
}
