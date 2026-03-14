import { useState } from 'react';
import { db } from '../firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { Loader2, CheckCircle, AlertCircle, Database, Trash2 } from 'lucide-react';
import { TIP_CATEGORIES, DEPARTMENTS, CAMPUS_LOCATIONS } from '../lib/constants';

// ─── 30 SAMPLE TIPS (Standardized to match constants.js) ─────────────────────
const SAMPLE_TIPS = [
  {
    title: "Prof. Sharma actually reads emails — but only before 9am",
    content: "If you need an extension or have a genuine query for Prof. Sharma (Theory of Computation), send your email before 9am. He reads every one before class. After that it gets buried. Subject line matters — be specific. 'Doubt regarding assignment 3 — Q2' gets a reply. 'Sir please help' does not.",
    category: "Academics",
    department: "CSE (Computer Science)",
    location: "University Building",
    upvotes: 34,
    isVerified: true,
  },
  {
    title: "The DBMS lab viva is 90% on normalization — prepare nothing else first",
    content: "Every batch for the last three years, the DBMS lab viva has been almost entirely 1NF, 2NF, 3NF, BCNF with one or two SQL query questions. Know your anomalies cold. Draw decomposition trees in your answer. Prof. Nair loves when you explain why a relation violates a normal form before stating how to fix it.",
    category: "Academics",
    department: "CSE (Computer Science)",
    location: "Tech Park",
    upvotes: 28,
    isVerified: true,
  },
  {
    title: "Borrow the previous 5 years of end-sem papers from the library's restricted shelf",
    content: "The library has a restricted shelf behind the issue counter with bound volumes of previous years' end-semester papers for every subject. You have to ask the librarian directly — they are not on the shelf. Pattern repeats heavily. For core subjects especially, 60% of questions come from the same topics every year.",
    category: "Academics",
    department: "Other",
    location: "Main Library",
    upvotes: 51,
    isVerified: true,
  },
  {
    title: "Enrol in the Open Elective: Business Communication — it is the easiest 8 credits you will get",
    content: "Business Communication is offered every even semester as an open elective. The internal marks are almost entirely attendance and one group presentation. The end-sem is theory-heavy but very predictable — the last three years' papers are almost identical. If you need elective credits without destroying your GPA, this is the one.",
    category: "Academics",
    department: "Other",
    location: "University Building",
    upvotes: 19,
    isVerified: true,
  },
  {
    title: "Applied Maths 3 attendance below 75% = detained. No exceptions ever.",
    content: "Prof. Kulkarni runs Applied Maths 3 and she enforces the 75% rule without any exceptions whatsoever. Medical leave counts only if you submit a certificate within 3 days of the absence. Condonation applications have been rejected every single time in recent memory. Count your leaves from week one — do not wait for the warning letter.",
    category: "Academics",
    department: "Other",
    location: "University Building",
    upvotes: 42,
    isVerified: true,
  },
  {
    title: "ECE semester 5 load is brutal — start Digital Signal Processing in the summer",
    content: "Semester 5 for ECE has DSP, Microprocessors, Control Systems, and VLSI running simultaneously. DSP especially has a steep learning curve if you see it for the first time in class. Spend two weeks in the summer before Sem 5 on the basics of Z-transforms and Fourier analysis. You will be months ahead of your batch.",
    category: "Academics",
    department: "ECE (Electronics)",
    location: "ECE Block",
    upvotes: 23,
    isVerified: true,
  },
  {
    title: "The compiler lab assignment is judged on comments and variable names, not just output",
    content: "Prof. Desai for Compiler Design lab is obsessive about code readability. Two students with working programs — the one with clean variable names, proper comments, and indentation scores 8–10 marks higher. Take 20 minutes before submission to clean your code. The program running is the minimum, not the goal.",
    category: "Academics",
    department: "CSE (Computer Science)",
    location: "Tech Park",
    upvotes: 17,
    isVerified: true,
  },
  {
    title: "Mechanical Sem 4 — Fluid Mechanics numericals repeat almost verbatim from 2019",
    content: "If you are in Mechanical Sem 4, the Fluid Mechanics end-sem paper from 2019 is the single most valuable resource you have. The question styles, unit conversions used, and pipe flow scenarios are extremely similar year after year. Solve every numerical from that paper with full working. Understand the method, not just the answer.",
    category: "Academics",
    department: "Mechanical",
    location: "Mechanical Block",
    upvotes: 15,
    isVerified: true,
  },
  {
    title: "Civil drawing submissions — get your sheets signed the day before, not the morning of",
    content: "For Engineering Drawing and Civil Drawing lab submissions, the batch before us lost marks because they came for signatures the morning of submission when Prof. Joshi was in class. He is only available in his cabin from 3pm–5pm on weekdays. Go the day before. Keep a duplicate of every sheet you submit — submissions have gone missing twice.",
    category: "Academics",
    department: "Civil",
    location: "Other",
    upvotes: 11,
    isVerified: false,
  },
  {
    title: "Internal assessment marks can be rechecked — most students do not know this",
    content: "Under the university rules, you can formally request a re-evaluation of your internal assessment answer sheet within 7 days of marks being announced. Submit a written application to the HOD. Two people from our batch got 6–8 marks added this way. It is your right — use it if you think something was marked incorrectly.",
    category: "Academics",
    department: "Other",
    location: "University Building",
    upvotes: 38,
    isVerified: true,
  },
  {
    title: "The Tech Fest organizing committee applications open in August — apply early",
    content: "Annually, the college Tech Fest recruiting committee members opens in August. Most students apply in September when reminders go out — by then the good roles (event lead, sponsorship, design) are already gone. Apply in the first two weeks of August. Even if you are in first year, you can get in as a volunteer, and that is how you get a core role the next year.",
    category: "Social",
    department: "Other",
    location: "University Building",
    upvotes: 22,
    isVerified: true,
  },
  {
    title: "Freshers night seating — go with your hostel batch, not your class batch",
    content: "Freshers night gets very crowded and the seating fills up 45 minutes before the event officially starts. Your hostel corridor will coordinate better than your class will. Sit together as a hostel group — you will actually know each other and the evening is more enjoyable. Class bonding at college events takes longer than hostel bonding.",
    category: "Social",
    department: "Other",
    location: "Other",
    upvotes: 9,
    isVerified: false,
  },
  {
    title: "The coding club has resources, not just competitions — read their internal drive",
    content: "The Coding Club maintains a Google Drive with curated DSA sheets, placement prep resources, project ideas, and interview experiences from alumni. You do not need to be an active club member to access it. Ask any second or third year in the club and they will share the link. Far more useful than anything they post on Instagram.",
    category: "Social",
    department: "CSE (Computer Science)",
    location: "Tech Park",
    upvotes: 31,
    isVerified: true,
  },
  {
    title: "The NSS team gets priority for NCC certificates and volunteering hours — enrol in Sem 1",
    content: "If you are planning to apply to PSUs or government jobs after graduation, NCC and NSS participation adds points in selection criteria. NSS enrolment happens only in Semester 1 of first year. If you miss that window, you cannot join. Even if you are uncertain about PSUs, enrol — it costs you one Saturday per month and the certificate has real value.",
    category: "Social",
    department: "Other",
    location: "Sports Complex",
    upvotes: 14,
    isVerified: true,
  },
  {
    title: "Birthday in the hostel? The canteen will make a cake if you order 2 days ahead",
    content: "The canteen uncle (Ravi bhai) will make a proper cake if you give him two days' notice and pay the advance. Rs. 300–400 for a decent half-kg cake. Much better than ordering from outside and waiting at the gate. He will not advertise this — you have to go to the canteen counter and ask him directly.",
    category: "Social",
    department: "Other",
    location: "Java Canteen",
    upvotes: 27,
    isVerified: true,
  },
  {
    title: "The library has a quiet study room on the first floor that almost nobody uses",
    content: "There is a glass-walled study room on the first floor of the library that fits about 12 people and almost no one knows about it. It has AC, power sockets at every seat, and no mobile phone noise because everyone there is actually studying. During exam week the main floor gets extremely crowded — this room stays empty at 70% capacity.",
    category: "Social",
    department: "Other",
    location: "Main Library",
    upvotes: 46,
    isVerified: true,
  },
  {
    title: "The printer near the admin block prints at Rs. 2/page and works at 11pm",
    content: "The stationery shop at the back gate is operated by someone who lives on campus and stays open until 11:30pm for urgent prints. Rs. 2 per page black and white, Rs. 12 colour. The printer inside the main building closes at 6pm. For any late-night submission emergency, this is the only option within the campus boundary.",
    category: "Infrastructure",
    department: "Other",
    location: "Other",
    upvotes: 58,
    isVerified: true,
  },
  {
    title: "Lab 3 in the CSE block has the best machines — book it for final year project demos",
    content: "Computer Lab 3 (second floor, CSE block) has the most recently updated machines with 16GB RAM. Labs 1 and 2 have older systems that can crash during live demos. For your final year project presentation, you can request Lab 3 from the lab assistant (Prakash sir) at least 3 days in advance. He books it for batches on a first-come basis.",
    category: "Infrastructure",
    department: "CSE (Computer Science)",
    location: "CSE Block",
    upvotes: 20,
    isVerified: true,
  },
  {
    title: "The hostel hot water schedule: 5:30am–7:30am and 7pm–9pm only",
    content: "Hostel Block A and B have hot water geysers that run on a timer — 5:30am to 7:30am in the morning and 7pm to 9pm in the evening. Outside these times the water is cold. Block C has a separate boiler that is often down for repair. If you are shifting hostels, Block A is closest to the mess and has the most reliable hot water.",
    category: "Infrastructure",
    department: "Other",
    location: "Hostel Zone",
    upvotes: 33,
    isVerified: true,
  },
  {
    title: "The WiFi dead zone: entire Ground floor of the ECE block gets no signal",
    content: "The ground floor of the ECE department building has no functional WiFi. The access point was moved during renovation two years ago and was never relocated. If you have an online exam or need to submit something digitally while in that building, go to the first floor corridor near the HOD cabin — signal is good there.",
    category: "Infrastructure",
    department: "ECE (Electronics)",
    location: "ECE Block",
    upvotes: 25,
    isVerified: true,
  },
  {
    title: "The ATM on campus runs out of cash every Friday afternoon — withdraw before noon",
    content: "The SBI ATM near the main gate regularly empties out by 2pm on Fridays before the weekend. The cash van comes Monday mornings. If you need cash over the weekend, withdraw Thursday evening or Friday morning. The nearest off-campus ATM is a 15-minute auto ride to the town centre.",
    category: "Infrastructure",
    department: "Other",
    location: "Other",
    upvotes: 39,
    isVerified: true,
  },
  {
    title: "The civil engineering drawing hall opens at 7am — best time to finish submissions",
    content: "The drawing hall for Civil Engineering opens at 7am, an hour before regular classes start. The lab assistant, Suresh sir, comes early. If you have a drawing submission due and need to finish last-minute work, coming in at 7am gives you a full quiet hour with all the drafting tools available and no crowd.",
    category: "Infrastructure",
    department: "Civil",
    location: "Other",
    upvotes: 12,
    isVerified: true,
  },
  {
    title: "Sports equipment can be borrowed free from the PT office with your ID card",
    content: "The Physical Training office near the sports ground lends out cricket bats, footballs, badminton rackets, and TT equipment free of charge against your college ID card. You can borrow for up to 24 hours. Most students do not know this and buy their own equipment unnecessarily.",
    category: "Infrastructure",
    department: "Other",
    location: "Sports Complex",
    upvotes: 18,
    isVerified: true,
  },
  {
    title: "The canteen has better food before 1pm — after that everything is reheated",
    content: "If you have a free period in the morning or an early lunch break, the canteen food quality is noticeably better. Fresh items arrive by 12:30pm. After the 1pm rush, most items are reheated and the dosa batter runs out by 1:15pm. The idli is consistently the best thing on the menu regardless of time — it is made fresh in batches.",
    category: "Infrastructure",
    department: "Other",
    location: "Java Canteen",
    upvotes: 29,
    isVerified: true,
  },
  {
    title: "Placement registration closes silently — check the portal every week from Sem 5",
    content: "The Training and Placement (T&P) portal has registration windows for each company that open and close without any announcement on the college WhatsApp groups. Multiple students missed Infosys and TCS registration last year because they checked the portal too late. Log in every Sunday evening from the start of Semester 5 and check for new company listings.",
    category: "Career",
    department: "Other",
    location: "University Building",
    upvotes: 47,
    isVerified: true,
  },
  {
    title: "CGPA below 6.5 locks you out of 70% of on-campus companies — fix it by Sem 5",
    content: "Almost all on-campus companies have a minimum CGPA cutoff of 6.5 for shortlisting. Some have 7.0 or 7.5. Once Semester 6 marks are locked, there is very little you can do about your aggregate. If your CGPA is below 6.5 at the end of Semester 4, treat Semester 5 as the most important semester of your degree.",
    category: "Career",
    department: "Other",
    location: "University Building",
    upvotes: 53,
    isVerified: true,
  },
  {
    title: "The T&P office has company-specific aptitude test papers — ask for them",
    content: "The T&P office maintains a physical binder collection of previous years' aptitude test papers from companies that have visited campus — TCS, Infosys, Wipro, Capgemini, L&T and others. These are NOT on the college website. Walk into the T&P office and ask the coordinator (Ms. Priya) directly. She will give you access.",
    category: "Career",
    department: "Other",
    location: "University Building",
    upvotes: 62,
    isVerified: true,
  },
  {
    title: "Mock interview slots in Sem 7 fill within hours — set a calendar reminder for Day 1",
    content: "The college arranges mock interviews with alumni and industry volunteers in Semester 7. The registration form opens at 9am on a specific date that is announced in the T&P notice board — not by email. Slots for morning sessions fill within 2–3 hours. Stand outside the T&P office when registration opens.",
    category: "Career",
    department: "Other",
    location: "University Building",
    upvotes: 35,
    isVerified: true,
  },
  {
    title: "Core companies for ECE visit in November — start circuit design revision in August",
    content: "Core electronics companies (ISRO, DRDO, Texas Instruments, Qualcomm) that recruit ECE students typically conduct written tests in November of Sem 7. The written test is heavily focused on analog circuits, digital electronics, microprocessors, and basic signal processing. Start revision in August.",
    category: "Career",
    department: "ECE (Electronics)",
    location: "ECE Block",
    upvotes: 21,
    isVerified: true,
  },
  {
    title: "LinkedIn alumni network from this college is very active — use it",
    content: "Search LinkedIn for your college name and filter by alumni. There are over 400 alumni from this college who are active on LinkedIn and many of them respond to genuine outreach messages. Do not ask for a referral in the first message. Ask for a 15-minute call to understand their role and company. The referral conversation happens naturally after that.",
    category: "Career",
    department: "Other",
    location: "University Building",
    upvotes: 44,
    isVerified: true,
  },
];

function getSemesterStamp() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const sem = (month >= 0 && month <= 5) ? 'Semester 2' : 'Semester 1';
  return `${sem}, ${year}`;
}

export default function SeedPage() {
  const [status, setStatus] = useState('idle'); // idle | seeding | done | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSeed() {
    if (status === 'seeding') return;
    setStatus('seeding');
    setProgress(0);
    setErrorMsg('');

    try {
      const sem = getSemesterStamp();
      const batch = writeBatch(db);

      SAMPLE_TIPS.forEach((tip, index) => {
        const ref = doc(collection(db, 'tips'));
        batch.set(ref, {
          title: tip.title,
          content: tip.content,
          category: tip.category,
          department: tip.department,
          location: tip.location,
          upvotes: tip.upvotes,
          isVerified: tip.isVerified,
          authorId: 'seed_admin_uid',
          authorName: 'Time Capsule Team',
          upvotedBy: [],
          downvotedBy: [], // Added for compatibility with voting system
          flagCount: 0,
          flaggedBy: [],
          hidden: false,
          relevantCount: 0,
          relevantBy: [],
          semester: sem,
          createdAt: serverTimestamp(),
        });
        setProgress(index + 1);
      });

      await batch.commit();
      setStatus('done');
    } catch (err) {
      console.error('Seed error:', err);
      setErrorMsg(err.code || err.message);
      setStatus('error');
    }
  }

  return (
    <div className="p-4 md:p-6 pb-24 min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-lg w-full text-center">
        <div className="w-16 h-16 bg-[var(--color-brand-cream)] rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-200">
          <Database size={32} className="text-[var(--color-brand-green)]" />
        </div>

        <h2 className="text-2xl font-serif font-bold text-[var(--color-brand-green)] mb-2">
          Update & Seed Data
        </h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Standardizing <strong>30 sample tips</strong> to match the application's categories and departments. This will fix the filtering issues.
        </p>

        {status === 'idle' && (
          <button
            onClick={handleSeed}
            className="px-8 py-3 bg-[var(--color-brand-green)] hover:bg-[#043326] text-white font-semibold rounded-lg shadow-sm border border-[var(--color-brand-charcoal)] transition-all"
          >
            Seed Standardized Tips
          </button>
        )}

        {status === 'seeding' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-[var(--color-brand-green)]" />
            <p className="text-sm font-medium text-gray-600">
              Writing {progress}/30 tips to Firestore...
            </p>
          </div>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle size={40} className="text-green-500" />
            <p className="text-lg font-bold text-green-700">Tips seeded & fixed!</p>
            <a
              href="/"
              className="mt-4 px-6 py-2 bg-[var(--color-brand-lavender)] hover:bg-[#d8bcf5] text-[var(--color-brand-charcoal)] font-semibold rounded-lg border border-[var(--color-brand-charcoal)] transition-colors inline-block"
            >
              Go to Feed →
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle size={40} className="text-red-500" />
            <p className="text-sm font-semibold text-red-700">Seeding failed: {errorMsg}</p>
            <button
              onClick={handleSeed}
              className="mt-2 px-6 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
