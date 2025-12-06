import { db } from "../../db";
import { educationRecords, userProfiles } from "@shared/schema";
import type { User } from "@shared/schema";

export async function seedEducation(insertedUsers: User[]): Promise<void> {
  if (insertedUsers.length === 0) return;

  const mockEducationRecords = [
    {
      userId: insertedUsers[0].id,
      institution: "Tech University",
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      startDate: "2022-09-01",
      endDate: "2026-05-31",
      description: "Focused on software engineering, AI, and web development. Active member of the coding club and participated in multiple hackathons."
    },
    {
      userId: insertedUsers[0].id,
      institution: "Online Learning Platform",
      degree: "Certificate",
      fieldOfStudy: "Full-Stack Web Development",
      startDate: "2023-06-01",
      endDate: "2023-09-30",
      description: "Completed comprehensive program covering React, Node.js, PostgreSQL, and modern web development practices."
    },
    {
      userId: insertedUsers[1].id,
      institution: "Design Institute",
      degree: "Bachelor of Arts",
      fieldOfStudy: "UI/UX Design",
      startDate: "2021-09-01",
      endDate: "2025-05-31",
      description: "Specialized in user-centered design, visual design principles, and prototyping. Led design projects for local startups."
    },
  ];

  console.log("Inserting education records...");
  const insertedEducation = await db.insert(educationRecords).values(mockEducationRecords).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedEducation.length} education records`);
}

export async function seedUserProfiles(insertedUsers: User[]): Promise<void> {
  if (insertedUsers.length < 8) return;

  const mockUserProfiles = [
    {
      userId: insertedUsers[2].id,
      universityMission: "Demo University is committed to fostering innovation, critical thinking, and academic excellence. We prepare the next generation of leaders through cutting-edge research, collaborative learning environments, and strong industry partnerships.",
      focusAreas: ["STEM Education", "Innovation & Research", "Industry Partnerships", "Student Success", "Global Learning"],
      opportunitiesOffered: "We offer comprehensive career services, state-of-the-art research facilities, internship programs with leading companies, study abroad opportunities in 50+ countries, and an extensive alumni network spanning across industries worldwide.",
      contactEmail: "info@demouniversity.edu",
      contactPhone: "+1 (555) 123-4567",
      website: "https://www.demouniversity.edu"
    },
    {
      userId: insertedUsers[3].id,
      companyMission: "Demo Tech Inc is at the forefront of technological innovation, developing solutions that transform industries and improve lives.",
      industryFocus: ["Artificial Intelligence", "Cloud Computing", "Software Development", "Data Analytics", "Cybersecurity"],
      partnershipOpportunities: "We partner with universities to create industry-academia collaborations, offer guest lectures and workshops, sponsor student competitions and hackathons, and provide research grants for innovative projects.",
      hiringOpportunities: "We're actively recruiting talented graduates for positions in software engineering, data science, product management, UX design, and technical consulting."
    },
    {
      userId: insertedUsers[6].id,
      universityMission: "At State University, we are dedicated to providing accessible, high-quality education that transforms lives and communities.",
      focusAreas: ["Social Sciences", "Engineering & Technology", "Business & Entrepreneurship", "Health Sciences", "Environmental Studies"],
      opportunitiesOffered: "Students benefit from personalized academic advising, hands-on research opportunities, industry internships, career development workshops, and access to a robust alumni network.",
      contactEmail: "admissions@stateuniversity.edu",
      contactPhone: "+1 (555) 987-6543",
      website: "https://www.stateuniversity.edu"
    },
    {
      userId: insertedUsers[7].id,
      companyMission: "TechCorp Solutions is a leader in enterprise technology, helping organizations worldwide innovate and succeed in the digital age.",
      industryFocus: ["Enterprise Software", "Digital Transformation", "Machine Learning", "IoT Solutions", "Blockchain Technology"],
      partnershipOpportunities: "We collaborate with universities through sponsored research, capstone project partnerships, internship programs, and technology donations.",
      hiringOpportunities: "TechCorp is hiring for roles in software development, cloud architecture, data engineering, DevOps, and technical project management."
    }
  ];

  console.log("Inserting user profiles...");
  const insertedProfiles = await db.insert(userProfiles).values(mockUserProfiles).onConflictDoNothing().returning();
  console.log(`Inserted ${insertedProfiles.length} user profiles`);
}
