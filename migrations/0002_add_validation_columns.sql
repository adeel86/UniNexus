-- Add missing columns to student_courses table
ALTER TABLE student_courses 
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS is_enrolled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_validated BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS validated_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS validation_note TEXT,
ADD COLUMN IF NOT EXISTS assigned_teacher_id VARCHAR(255);

-- Add foreign key constraints if they don't exist
ALTER TABLE student_courses
ADD CONSTRAINT IF NOT EXISTS fk_student_courses_validated_by
FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE student_courses
ADD CONSTRAINT IF NOT EXISTS fk_student_courses_assigned_teacher_id
FOREIGN KEY (assigned_teacher_id) REFERENCES users(id) ON DELETE SET NULL;
