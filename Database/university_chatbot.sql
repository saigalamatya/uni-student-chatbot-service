-- ====================================================
-- University AI Chatbot Database Schema 
-- ====================================================

-- Drop existing tables for a clean installation
DROP TABLE IF EXISTS chat_history;
DROP TABLE IF EXISTS knowledge_base;
DROP TABLE IF EXISTS users;

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS university_chatbot;
USE university_chatbot;

-- --------------------------------------------------
-- 1. Users table
-- --------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('student', 'staff', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------
-- 2. Chat history table
-- --------------------------------------------------
CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    category VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- --------------------------------------------------
-- 3. Knowledge base table 
-- --------------------------------------------------
CREATE TABLE knowledge_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    question VARCHAR(255) NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT,
    priority INT DEFAULT 1
);

-- ====================================================
-- Knowledge Base Data 
-- ====================================================

-- Admissions (keywords include all needed variations)
INSERT INTO knowledge_base (category, question, answer, keywords, priority) VALUES
('Admissions', 'What are the admission requirements?',
 'To be considered for admission, you must submit:\n\n1. **Completed Application Form** – Online via our admission portal.\n2. **High School Diploma** or equivalent (GED).\n3. **Official Transcripts** from all previous institutions.\n4. **Minimum GPA** of 3.0 (on a 4.0 scale).\n5. **Standardized Test Scores** – SAT (minimum 1100) or ACT (minimum 22).\n6. **Personal Statement** (500‑700 words) explaining your academic goals.\n7. **Two Letters of Recommendation** from teachers or counselors.\n\nInternational students must also provide TOEFL/IELTS scores (TOEFL ≥ 80, IELTS ≥ 6.5).',
 'admission,requirements,apply,transcripts,gpa,sat,act,personal statement,recommendation,admission requirements,how to apply,application process', 5),

('Admissions', 'When is the application deadline?',
 'The application deadlines are:\n\n- **Fall Semester** – January 15 (priority), June 1 (final)\n- **Spring Semester** – October 15 (priority), November 15 (final)\n- **Summer Session** – March 1 (priority), April 1 (final)\n\nLate applications are accepted on a space‑available basis.',
 'deadline,application,date,final,priority,deadlines,application due dates,last date to apply', 5),

('Admissions', 'What documents are required for admission?',
 'The required documents are:\n- Completed online application form\n- Official high school transcripts (or GED certificate)\n- Official college transcripts (if transferring)\n- SAT or ACT scores\n- Personal statement/essay\n- Two letters of recommendation\n- Proof of English proficiency (for international students)\n- Application fee ($50)',
 'documents,requirements,apply,transcripts,essay,recommendation', 4),

('Admissions', 'What are the requirements for international students?',
 'International students must fulfill all general admission requirements plus:\n\n• Proof of English proficiency (TOEFL iBT ≥ 80 or IELTS ≥ 6.5).\n• Official transcripts evaluated by a recognized credential evaluation service (e.g., WES).\n• Financial affidavit showing sufficient funds for at least one year of study.\n• Copy of passport and visa (after admission).\n\nFor more details, visit our International Student Office in Building A, Room 103 or email intladmissions@university.edu.',
 'international,visa,toefl,ielts,english proficiency,financial affidavit', 4),

('Admissions', 'How do I apply for admission?',
 'Follow these steps to apply:\n1. **Create an account** on the Admission Portal (apply.university.edu).\n2. **Fill out the online application** – provide personal details, academic history, and intended major.\n3. **Upload required documents** (transcripts, test scores, personal statement, letters of recommendation).\n4. **Pay the $50 application fee** (waivers available for eligible students).\n5. **Submit your application** before the deadline.\n\nAfter submission, you will receive a confirmation email. You can track your application status in the portal. Decisions are released 4‑6 weeks after the deadline.',
 'how to apply,application steps,apply for admission', 5),

('Admissions', 'How do I check my application status?',
 'You can check your application status at any time by logging into the **Admission Portal** (apply.university.edu). After submitting your application, you will receive a confirmation email with login credentials. The portal shows missing documents, review progress, and the final decision. Decisions are typically released 4‑6 weeks after the deadline.',
 'application status,check,admission decision,portal', 3);

-- Tuition & Financial Aid
INSERT INTO knowledge_base (category, question, answer, keywords, priority) VALUES
('Tuition', 'What is the tuition fee?',
 'Tuition fees vary by program and residency status:\n\n**Undergraduate**\n- In‑state: $12,000 per semester\n- Out‑of‑state: $18,000 per semester\n\n**Graduate**\n- In‑state: $15,000 per semester\n- Out‑of‑state: $22,000 per semester\n\n**Additional fees**: $1,500 for technology, health, and activity fees per semester. Payment plans and financial aid are available to eligible students.',
 'tuition,fees,cost,payment,graduate,undergraduate,tuition cost,expenses', 4),

('Tuition', 'What is the tuition fee per semester?',
 'For one semester:\n- **Undergraduate (in‑state)**: $12,000\n- **Undergraduate (out‑of‑state)**: $18,000\n- **Graduate (in‑state)**: $15,000\n- **Graduate (out‑of‑state)**: $22,000\n\nPlus mandatory fees of $1,500 per semester. Total cost of attendance including housing and meals is approximately $25,000‑$35,000 per year for in‑state students.',
 'tuition per semester,semester tuition,fees per semester', 4),

('Financial Aid', 'How do I apply for financial aid?',
 'To apply for financial aid, follow these steps:\n1. **Complete the FAFSA** (Free Application for Federal Student Aid) by March 1st. Our school code is 123456.\n2. **Submit the University Financial Aid Application** through your student portal.\n3. **Provide any additional documents** requested, such as tax returns.\n4. **Review your financial aid offer** in the portal and accept the awards.\n\nTypes of aid include grants, scholarships, work‑study, and loans. Contact the Financial Aid Office at finaid@university.edu or (123) 456‑7892 for help.',
 'financial aid,FAFSA,scholarship,grant,loan,work-study,application', 4),

('Financial Aid', 'What scholarships are available?',
 'We offer a variety of scholarships:\n\n- **Merit‑Based Scholarships**: Awarded for academic excellence (GPA ≥ 3.5). Amounts range from $2,000 to $10,000 per year.\n- **Need‑Based Grants**: Based on FAFSA results.\n- **Departmental Scholarships**: Specific to majors (e.g., Engineering, Business, Arts).\n- **Athletic Scholarships**: For student‑athletes.\n- **Diversity & Inclusion Scholarships**: For underrepresented groups.\n\nVisit the financial aid portal for deadlines and application details.',
 'scholarship,merit,need-based,grant,award', 3),

('Financial Aid', 'When are financial aid deadlines?',
 'Financial aid deadlines:\n- **FAFSA Priority Deadline**: March 1st\n- **University Financial Aid Application Deadline**: March 15th\n- **Scholarship Application Deadlines**: Vary by scholarship; most are due by February 15th.\n\nLate applications are accepted but may receive reduced aid.',
 'financial aid,deadline,FAFSA,scholarship', 3),

('Financial Aid', 'What is the cost of meal plans?',
 'Meal plans range from $2,000 to $4,000 per semester. Options include:\n- **10 meals/week**: $2,000 + $200 dining dollars\n- **14 meals/week**: $2,800 + $300 dining dollars\n- **19 meals/week**: $3,600 + $400 dining dollars\n- **Unlimited**: $4,000 + $500 dining dollars\n\nYou can change your meal plan during the first two weeks of each semester.',
 'meal plan,cost,dining,food', 2);

-- Courses & Registration
INSERT INTO knowledge_base (category, question, answer, keywords, priority) VALUES
('Courses', 'How do I register for courses?',
 'Course registration is conducted online through the **Student Portal** (portal.university.edu). Follow these detailed steps:\n\n**1. Check Your Registration Appointment**\n- Log in to the Student Portal and click on "Registration".\n- Your appointment time (a specific date and time when registration opens for you) is based on your class standing (seniors get first priority).\n- Appointments are released in batches: Seniors in early April, Juniors in mid‑April, Sophomores in late April, Freshmen in early May for Fall semester.\n\n**2. Clear Any Holds**\n- Holds can be financial (unpaid bills), advising (mandatory meeting), or immunization (missing records).\n- To view holds, go to "Student Records" → "Holds". Resolve them at least 48 hours before your appointment.\n\n**3. Meet with Your Academic Advisor**\n- Advisors are assigned by department; you can find your advisor in the portal.\n- Schedule a meeting at least two weeks before registration to discuss course selection, degree requirements, and potential alternatives.\n- Bring a draft schedule to the meeting.\n\n**4. Search and Add Courses**\n- Use the **Course Catalog** (available online) to find courses by subject, number, or instructor.\n- Add courses to your "Shopping Cart" before your appointment – this does NOT guarantee a seat.\n- During your appointment, click "Register Now" to officially enroll.\n\n**5. Submit Registration**\n- After submitting, verify your schedule in "My Class Schedule".\n- If a course is full, join the waitlist (if available) and check your email daily for openings.\n\n**Need Help?**\n- Registrar’s Office: Building B, Room 201 | registrar@university.edu | (123) 456‑7891\n- Hours: Mon‑Fri 8:30 AM – 4:30 PM\n- Virtual advising: Available via Zoom – book through the portal.',
 'register,courses,classes,registration,advisor,appointment,holds,registration steps,enrollment,add drop classes', 5),

('Courses', 'When can I register for courses?',
 'Registration appointment times are assigned based on class standing:\n- **Seniors (90+ credits)**: early April\n- **Juniors (60‑89 credits)**: mid‑April\n- **Sophomores (30‑59 credits)**: late April\n- **Freshmen (0‑29 credits)**: early May\n\nFor Fall semester, registration runs from early April through mid‑May. For Spring semester, registration runs from early November through early December. You can see your exact appointment date and time in the Student Portal.',
 'when to register,registration timing,registration appointment', 4),

('Courses', 'Where can I find the course catalog?',
 'The official course catalog is available online at **catalog.university.edu**. You can browse by department, semester, or instructor. Features include:\n- **Course Descriptions** – detailed overview, prerequisites, credit hours.\n- **Faculty Information** – instructor names, office hours, research interests.\n- **Filter Tools** – search by day/time, location, or Gen Ed requirements.\n\nPrinted copies are available at the Registrar’s Office (Building B, Room 201) for $10. The catalog is updated in March for the upcoming academic year.',
 'catalog,courses,description,prerequisites,online,print', 4),

('Courses', 'How do I check course prerequisites?',
 'Prerequisites are listed in the course catalog next to each course. To verify you have completed them:\n- **Degree Audit** – Log in to the Student Portal, go to "DegreeWorks" to see your progress toward degree requirements.\n- **Academic Advisor** – During your advising session, ask your advisor to confirm you’ve met prerequisites.\n- **Department Contact** – Email the department offering the course for a prerequisite override if you have equivalent experience.\n\nIf you attempt to register for a course without meeting prerequisites, the system will block you. You can request a **prerequisite override** by submitting a form (available in the department office). Allow 3‑5 business days for processing.',
 'prerequisites,requirements,override,degree audit,advisor', 4),

('Courses', 'What is the academic calendar?',
 'Important dates for the upcoming academic year:\n\n**Fall 2025**\n- Classes begin: August 25\n- Thanksgiving break: November 24‑28\n- Last day of classes: December 5\n- Final exams: December 8‑12\n- Commencement: December 15\n\n**Spring 2026**\n- Classes begin: January 12\n- Spring break: March 9‑13\n- Last day of classes: April 30\n- Final exams: May 4‑8\n- Commencement: May 10\n\n**Summer 2026**\n- Session I: May 19 – June 26\n- Session II: June 30 – August 7\n\n**Additional Dates**\n- Registration opens for returning students: April 1 – April 30 (Fall)\n- Add/Drop period: first 10 days of each semester\n- Withdrawal deadline: end of 10th week (with ‘W’ grade)\n\nFull calendar with holidays and break details: **calendar.university.edu**.',
 'academic calendar,semester,start dates,finals,break,commencement', 4),

('Courses', 'How do I get an official transcript?',
 'You can request official transcripts online through the **Registrar’s Office** portal (transcript.university.edu). Cost: $10 per electronic copy, $15 per paper copy (mailed). Processing time: 3‑5 business days. Rush orders (24 hours) available for an extra $10. Unofficial transcripts can be printed from the Student Portal for free.',
 'transcript,official transcript,request,records', 3);

-- Library
INSERT INTO knowledge_base (category, question, answer, keywords, priority) VALUES
('Library', 'What are library hours?',
 'Regular hours:\n- Monday–Thursday: 8:00 AM – 10:00 PM\n- Friday: 8:00 AM – 6:00 PM\n- Saturday: 10:00 AM – 6:00 PM\n- Sunday: 12:00 PM – 8:00 PM\n\nDuring finals week, the library stays open 24/7. Check the library website for holiday closures.',
 'library,hours,time,open', 3),

('Library', 'How can I access online databases?',
 'You can access all online databases through the library website using your university login credentials. Resources include JSTOR, IEEE Xplore, ScienceDirect, and many more. If you need research assistance, contact a librarian at (123) 456‑7894 or via live chat on the library website.',
 'database,online,research,jstor,ieee', 2);

-- Housing
INSERT INTO knowledge_base (category, question, answer, keywords, priority) VALUES
('Housing', 'What housing options are available?',
 'We offer three types of on‑campus housing:\n\n- **Traditional Dormitories**: Shared rooms, community bathrooms. Ideal for freshmen.\n- **Suite‑Style Residences**: 4‑6 students share a suite with private bathrooms.\n- **Apartment‑Style**: Private or shared bedrooms with kitchen and living area. Great for upperclassmen.\n\nAll options are within walking distance of classes and dining halls. Apply through the housing portal by May 1st for priority.',
 'housing,dorm,accommodation,suite,apartment', 4),

('Housing', 'Is on‑campus housing available?',
 'Yes, on‑campus housing is available for all students. We offer traditional dormitories, suite‑style residences, and apartment‑style living. First‑year students are guaranteed housing if they apply by the May 1st priority deadline. Upperclassmen can also apply, but spaces are limited. Apply early to secure your preferred option.',
 'housing available,on campus housing,availability', 4),

('Housing', 'How much does on‑campus housing cost?',
 'Housing costs per semester:\n- Traditional Dorm: $5,000 – $6,000\n- Suite‑Style: $6,500 – $7,500\n- Apartment‑Style: $7,500 – $9,000\n\nMeal plans range from $2,000 to $4,000 per semester. Payment plans are available.',
 'housing,cost,price,dorm,apartment,meal plan', 3),

('Housing', 'How do I apply for housing?',
 'To apply for housing:\n1. Log in to the **Housing Portal** using your university credentials.\n2. Complete the **housing application** and pay the $200 deposit (refundable if you cancel by May 1st).\n3. Submit your **meal plan selection**.\n4. Wait for your **room assignment** (sent via email by mid‑July).\n\nFor questions, contact Housing Services at housing@university.edu or (123) 456‑7893.',
 'apply,application,process,dorm,apply for housing,housing application', 3),

('Housing', 'What amenities are included in housing?',
 'All housing options include:\n- High‑speed Wi‑Fi\n- 24/7 security and front desk\n- Laundry facilities\n- Common lounges and study areas\n- Utilities (water, electricity, heating/cooling) included\n\nAdditional amenities vary by residence hall (e.g., fitness rooms, game rooms, kitchenettes).',
 'amenities,features,included,wi-fi,laundry,security', 2),

('Housing', 'Can I live off‑campus?',
 'Yes, upperclassmen (60+ credits) and graduate students may live off‑campus. The university provides an off‑campus housing listing service through the Student Affairs website. You are not required to live on campus, but first‑year students are strongly encouraged to do so. If you choose off‑campus, you must still complete a housing waiver form by May 1st.',
 'off-campus,living off campus,waiver', 2);

-- Career Services
INSERT INTO knowledge_base (category, question, answer, keywords, priority) VALUES
('Career Services', 'What career services does the university offer?',
 'The Career Center provides:\n- **Resume & Cover Letter Reviews** – one‑on‑one appointments.\n- **Mock Interviews** – practice with feedback.\n- **Job & Internship Fairs** – held twice a year (fall and spring).\n- **Online Job Portal** – Handshake, where employers post opportunities.\n- **Career Counseling** – help with choosing a major or career path.\n- **Workshops** – on networking, LinkedIn, and job search strategies.\n\nVisit us in Building A, Room 201, or email career@university.edu.',
 'career,job,internship,placement,resume,interview,counseling', 4),

('Career Services', 'How can I find an internship?',
 'To find an internship:\n1. Log in to **Handshake** (the university job portal) and set up your profile.\n2. Browse internships by field, location, or company.\n3. Attend the **Career Fair** to meet recruiters in person.\n4. Schedule an appointment with a career advisor for personalized guidance.\n5. Check departmental boards for internship opportunities specific to your major.\n\nYou may also be eligible for academic credit for internships – ask your advisor.',
 'internship,job,work experience,handshake,career fair', 3),

('Career Services', 'How do I prepare for a job interview?',
 'The Career Center offers **mock interviews** (in‑person or via Zoom) to practice your responses, body language, and questions for employers. We also have online resources: interview tips, common questions, and a video recording studio for self‑practice. Schedule a mock interview through Handshake or call (123) 456‑7895.',
 'interview,mock interview,preparation,job interview', 2);

-- Student Support
INSERT INTO knowledge_base (category, question, answer, keywords, priority) VALUES
('Student Support', 'What student support services are available?',
 'We are committed to your well‑being. Support services include:\n\n- **Counseling Center** – free, confidential mental health support (Building C, Room 101).\n- **Health Center** – medical care, immunizations, and wellness programs.\n- **Disability Services** – accommodations for students with disabilities.\n- **Academic Tutoring** – free tutoring in math, writing, and science.\n- **Student Organizations** – over 200 clubs and groups.\n\nVisit the Student Affairs office (Building B) for referrals.',
 'support,counseling,health,disability,tutoring,clubs', 4),

('Student Support', 'Where is the health center?',
 'The Health Center is located in **Building F, Room 101**. Hours are Monday–Friday, 8:00 AM – 5:00 PM. Appointments are recommended; call (123) 456‑7896 to schedule. Walk‑ins are accepted for urgent issues.',
 'health,clinic,medical,appointment', 2),

('Student Support', 'How do I get a student ID card?',
 'New students receive their ID card during orientation. If you lose your card, you can get a replacement at the **Campus Card Office** (Building A, Room 5). Bring a government‑issued ID. Replacement fee: $20. The ID card is required for library access, meal plans, building entry, and exam proctoring.',
 'student id,id card,replacement,campus card', 2),

('Student Support', 'What IT support is available?',
 'The IT Help Desk provides support for Wi‑Fi, email, password resets, software installations, and classroom technology. Visit Building G, Room 101, call (123) 456‑7897, or email helpdesk@university.edu. Hours: Mon‑Fri 8am‑6pm, Sat 10am‑2pm.',
 'it support,technical help,wifi,password reset,help desk', 2);

-- Additional helpful entries
INSERT INTO knowledge_base (category, question, answer, keywords, priority) VALUES
('Parking', 'How do I get a parking permit?',
 'Parking permits are available online through the **Transportation Services** portal (parking.university.edu). Cost per semester:\n- Student permit: $150\n- Commuter permit: $100\n- Motorcycle: $50\n- Overnight parking requires an additional $50 fee. Permits are virtual (linked to your license plate). You can purchase them starting August 1 for Fall semester.',
 'parking,permit,car,transportation', 2),

('Transportation', 'Is there a campus shuttle?',
 'Yes, the university operates free shuttles on weekdays from 7 AM to 10 PM, stopping at all major buildings, the library, student union, and off‑campus apartment complexes. You can track shuttle locations via the "Campus Ride" app. Weekend service runs 10 AM to 6 PM with limited routes.',
 'shuttle,bus,transportation,campus ride', 2),

('Graduation', 'What are the requirements to graduate?',
 'To graduate, you must:\n1. Complete all required courses for your major (minimum 120 credits for bachelor’s).\n2. Achieve a cumulative GPA of at least 2.0.\n3. Submit a graduation application by the deadline:\n   - Fall graduation: September 15\n   - Spring graduation: February 15\n   - Summer graduation: June 15\n4. Clear all financial holds.\n5. Complete an exit survey (sent via email).\n\nCheck with your academic advisor for major‑specific requirements.',
 'graduation,degree,requirements,diploma,commencement', 3),

('Graduation', 'When is the commencement ceremony?',
 'Commencement ceremonies are held twice a year:\n- **Spring Commencement**: Second Saturday of May\n- **Fall Commencement**: Third Saturday of December\n\nTickets are required for guests (limit 6 per graduate). Caps and gowns can be ordered from the bookstore starting two months before the ceremony.',
 'commencement,graduation ceremony,cap and gown', 2),

('Study Abroad', 'Does the university offer study abroad programs?',
 'Yes, we have over 50 study abroad programs in 30 countries. Options include semester‑long, summer, and faculty‑led short trips. Scholarships are available. Visit the **Global Education Office** (Building H, Room 202) or studyabroad@university.edu for details. Application deadlines: October 15 for Spring, March 15 for Fall.',
 'study abroad,exchange,global education,international', 2);

-- ====================================================
-- Admin User 
-- ====================================================
-- To generate a hash, run:
--   node -e "console.log(require('bcrypt').hashSync('admin123', 10))"
-- Then copy the output and replace the placeholder below.
INSERT INTO users (username, email, password_hash, user_type) 
VALUES ('admin', 'admin@university.edu', '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'admin')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- ====================================================
-- Add indexes for faster searches 
-- ====================================================
CREATE INDEX idx_kb_keywords ON knowledge_base(keywords(255));
CREATE INDEX idx_chat_user ON chat_history(user_id);
CREATE INDEX idx_chat_timestamp ON chat_history(timestamp);