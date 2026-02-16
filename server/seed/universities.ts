import { db } from "../db";
import { universities } from "@shared/schema";

async function seed() {
  const universityList = [
    { name: "Massachusetts Institute of Technology", location: "Cambridge, MA" },
    { name: "Harvard University", location: "Cambridge, MA" },
    { name: "Stanford University", location: "Stanford, CA" },
    { name: "University of California, Berkeley", location: "Berkeley, CA" },
    { name: "Oxford University", location: "Oxford, UK" },
    { name: "University of Cambridge", location: "Cambridge, UK" },
    { name: "National University of Singapore", location: "Singapore" },
  ];

  for (const uni of universityList) {
    try {
      await db.insert(universities).values(uni).onConflictDoNothing();
    } catch (e) {
      console.error("Error seeding university:", uni.name, e);
    }
  }
  console.log("Universities seeded successfully");
}

seed();
