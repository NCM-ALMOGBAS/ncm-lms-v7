
const express = require("express");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const db = new Database(path.join(__dirname, "ncm_lms.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  trainer TEXT,
  type TEXT,
  link TEXT,
  price REAL DEFAULT 0,
  hours INTEGER DEFAULT 0,
  next_course TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_type TEXT NOT NULL,
  emp_id TEXT,
  national_id TEXT,
  name TEXT NOT NULL,
  dept TEXT,
  job TEXT,
  email TEXT,
  mobile TEXT,
  course_id INTEGER,
  course_title TEXT,
  reason TEXT,
  status TEXT,
  curriculum TEXT,
  attendance_link TEXT,
  course_done INTEGER DEFAULT 0,
  exam_enabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  course_id INTEGER,
  course_title TEXT,
  visible INTEGER DEFAULT 0,
  questions_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER,
  student_name TEXT,
  student_ref TEXT,
  email TEXT,
  exam_id INTEGER,
  exam_title TEXT,
  course_title TEXT,
  answers_json TEXT,
  score TEXT DEFAULT 'لم يصحح',
  feedback TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cert_no TEXT,
  name TEXT,
  email TEXT,
  course_title TEXT,
  score TEXT,
  feedback TEXT,
  hr_linked INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

function seed() {
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const ins = db.prepare("INSERT INTO users (role,name,email,password) VALUES (?,?,?,?)");
    ins.run("admin", "الإدارة", "admin@ncm.gov.sa", "NCM@2026");
    ins.run("hr", "HR", "hr@ncm.gov.sa", "HR@2026");
    ins.run("trainer", "المدرب", "trainer@ncm.gov.sa", "Trainer@2026");
  }
  const courseCount = db.prepare("SELECT COUNT(*) AS c FROM courses").get().c;
  if (courseCount === 0) {
    db.prepare(`INSERT INTO courses (title,description,trainer,type,link,price,hours,next_course,active)
      VALUES (?,?,?,?,?,?,?,?,1)`)
      .run("أساسيات الأرصاد الجوية", "مدخل إلى مفاهيم الطقس والرصد والتنبؤ.", "مدرب أرصاد", "عن بعد", "https://teams.microsoft.com/", 500, 8, "تحليل البيانات الأرصادية");
  }
  const examCount = db.prepare("SELECT COUNT(*) AS c FROM exams").get().c;
  if (examCount === 0) {
    const questions = [
      ["ما المقصود بالرصد الجوي؟", ["قياس عناصر الطقس","قياس حركة المرور","قياس جودة الطرق","قياس الكهرباء"], 0, 5],
      ["أي مما يلي عنصر من عناصر الطقس؟", ["درجة الحرارة","عدد السكان","أسعار الوقود","حركة التجارة"], 0, 5],
      ["الأداة المستخدمة لقياس درجة الحرارة؟", ["الترمومتر","البارومتر","الأنيمومتر","الهيجرومتر"], 0, 5],
      ["ما الذي يقيسه البارومتر؟", ["الضغط الجوي","الرطوبة","سرعة الرياح","كمية المطر"], 0, 5],
      ["ما المقصود بالرطوبة النسبية؟", ["نسبة بخار الماء في الهواء","درجة حرارة البحر","سرعة الرياح","ارتفاع السحب"], 0, 5],
      ["جهاز قياس سرعة الرياح؟", ["الأنيمومتر","الترمومتر","البارومتر","مقياس المطر"], 0, 5],
      ["أهمية التنبؤات الجوية للمواطن؟", ["السلامة والتخطيط اليومي","زيادة الازدحام","إيقاف الخدمات","تقليل الوعي"], 0, 5],
      ["ما المقصود بالإنذار المبكر؟", ["تنبيه قبل حالة جوية مؤثرة","إعلان تجاري","تقرير مالي","إشعار إداري"], 0, 5],
      ["أي مما يلي يرتبط بالأمطار؟", ["الهطول","الجفاف المطلق","الضغط المرتفع دائمًا","الضباب فقط"], 0, 5],
      ["دور محطات الرصد؟", ["جمع بيانات الطقس","إصدار الفواتير","إدارة المركبات","تسجيل الحضور"], 0, 5],
      ["ما المقصود بالكتلة الهوائية؟", ["حجم هواء بخصائص متقاربة","جهاز رصد","نوع سحب فقط","مركز بيانات"], 0, 5],
      ["ما الذي يرفع دقة التنبؤ؟", ["توفر بيانات رصد جيدة","غياب البيانات","تأخير التحليل","حذف القياسات"], 0, 5],
      ["ما هو الضباب؟", ["قطرات ماء عالقة قرب سطح الأرض","رياح شديدة فقط","ارتفاع حرارة","انخفاض ضغط فقط"], 0, 5],
      ["من يستفيد من بيانات الطقس؟", ["الطيران والملاحة والدفاع المدني والمواطن","المطاعم فقط","المكتبات فقط","أنشطة لا ترتبط بالطقس"], 0, 5],
      ["هدف نشر المعلومات الأرصادية؟", ["تعزيز السلامة والوعي","إخفاء البيانات","منع التخطيط","تقليل الاستفادة"], 0, 5]
    ].map(q => ({ text:q[0], options:q[1], correct:q[2], points:q[3] }));
    db.prepare("INSERT INTO exams (title,course_id,course_title,visible,questions_json) VALUES (?,?,?,?,?)")
      .run("اختبار أساسيات الأرصاد الجوية", 1, "أساسيات الأرصاد الجوية", 0, JSON.stringify(questions));
  }
}
seed();

function mailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendMail(to, subject, html) {
  if (!to) return { skipped: true, reason: "No recipient email" };
  const t = mailer();
  if (!t) {
    console.log("[EMAIL SIMULATION]", { to, subject, html });
    return { simulated: true };
  }
  await t.sendMail({
    from: process.env.SMTP_FROM || "NCM LMS <no-reply@ncm.gov.sa>",
    to,
    subject,
    html
  });
  return { sent: true };
}

function requireRole(req, res, next) {
  const role = req.headers["x-role"];
  if (!role) return res.status(401).json({ error: "Missing role" });
  req.role = role;
  next();
}

app.post("/api/login", (req, res) => {
  const { role, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE role=? AND password=?").get(role, password);
  if (!user) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  res.json({ ok: true, role: user.role, name: user.name, email: user.email });
});

app.get("/api/bootstrap", (req, res) => {
  res.json({
    courses: db.prepare("SELECT * FROM courses WHERE active=1").all(),
    exams: db.prepare("SELECT id,title,course_id,course_title,visible FROM exams").all()
  });
});

app.get("/api/courses", (req, res) => {
  res.json(db.prepare("SELECT * FROM courses ORDER BY id DESC").all());
});

app.post("/api/courses", requireRole, (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const c = req.body;
  const info = db.prepare(`INSERT INTO courses (title,description,trainer,type,link,price,hours,next_course,active)
    VALUES (?,?,?,?,?,?,?,?,1)`).run(c.title, c.description, c.trainer, c.type, c.link, c.price || 0, c.hours || 0, c.next_course || "");
  res.json({ id: info.lastInsertRowid });
});

app.post("/api/requests/internal", async (req, res) => {
  const r = req.body;
  const course = db.prepare("SELECT * FROM courses WHERE id=?").get(r.course_id);
  const info = db.prepare(`INSERT INTO requests 
    (requester_type, emp_id, name, dept, job, email, course_id, course_title, reason, status, attendance_link)
    VALUES ('internal',?,?,?,?,?,?,?,'مرسل إلى HR',?)`)
    .run(r.emp_id, r.name, r.dept, r.job, r.email, r.course_id, course?.title || "", r.reason || "", course?.link || "");
  await sendMail(r.email, "تأكيد استلام طلبك التدريبي", `<p>تم استلام طلبك لدورة: <b>${course?.title || ""}</b></p><p>رقم الطلب: ${info.lastInsertRowid}</p>`);
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.post("/api/requests/external", async (req, res) => {
  const r = req.body;
  const course = db.prepare("SELECT * FROM courses WHERE id=?").get(r.course_id);
  const info = db.prepare(`INSERT INTO requests 
    (requester_type, national_id, name, email, mobile, course_id, course_title, status, attendance_link)
    VALUES ('external',?,?,?,?,?,?,'تسجيل خارجي / دفع تجريبي',?)`)
    .run(r.national_id, r.name, r.email, r.mobile, r.course_id, course?.title || "", course?.link || "");
  await sendMail(r.email, "تأكيد التسجيل في منصة التدريب", `<p>تم تسجيلك في دورة: <b>${course?.title || ""}</b></p><p>رقم الطلب: ${info.lastInsertRowid}</p>`);
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.get("/api/requests", requireRole, (req, res) => {
  res.json(db.prepare("SELECT * FROM requests ORDER BY id DESC").all());
});

app.get("/api/requests/status/:q", (req, res) => {
  const q = `%${req.params.q}%`;
  const rows = db.prepare(`SELECT id, requester_type, name, emp_id, national_id, course_title, status 
    FROM requests WHERE CAST(id AS TEXT) LIKE ? OR name LIKE ? OR emp_id LIKE ? OR national_id LIKE ? ORDER BY id DESC`)
    .all(q,q,q,q);
  res.json(rows);
});

app.post("/api/hr/:id/approve", requireRole, async (req, res) => {
  if (req.role !== "hr" && req.role !== "admin") return res.status(403).json({ error: "HR only" });
  db.prepare("UPDATE requests SET status='معتمد من HR / لدى المدرب' WHERE id=?").run(req.params.id);
  const r = db.prepare("SELECT * FROM requests WHERE id=?").get(req.params.id);
  await sendMail(r.email, "تم اعتماد طلبك من HR", `<p>تم اعتماد طلبك لدورة: <b>${r.course_title}</b>.</p><p>سيقوم المدرب بتجهيز المنهج والرابط.</p>`);
  res.json({ ok: true });
});

app.post("/api/hr/:id/reject", requireRole, async (req, res) => {
  db.prepare("UPDATE requests SET status='مرفوض من HR' WHERE id=?").run(req.params.id);
  const r = db.prepare("SELECT * FROM requests WHERE id=?").get(req.params.id);
  await sendMail(r.email, "تم تحديث حالة طلبك", `<p>تم رفض طلبك لدورة: <b>${r.course_title}</b>.</p>`);
  res.json({ ok: true });
});

app.post("/api/trainer/:id/accept", requireRole, async (req, res) => {
  if (req.role !== "trainer" && req.role !== "admin") return res.status(403).json({ error: "Trainer only" });
  db.prepare("UPDATE requests SET status='قبله المدرب / تجهيز المنهج' WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/trainer/:id/send-curriculum", requireRole, async (req, res) => {
  if (req.role !== "trainer" && req.role !== "admin") return res.status(403).json({ error: "Trainer only" });
  const { curriculum, attendance_link } = req.body;
  db.prepare("UPDATE requests SET curriculum=?, attendance_link=?, status='تم إرسال المنهج والرابط للمتدرب' WHERE id=?")
    .run(curriculum || "", attendance_link || "", req.params.id);
  const r = db.prepare("SELECT * FROM requests WHERE id=?").get(req.params.id);
  await sendMail(r.email, "تم إرسال منهج الدورة", `<p>منهج الدورة:</p><p>${curriculum || ""}</p><p>رابط الحضور: <a href="${attendance_link || "#"}">${attendance_link || ""}</a></p><p>بعد إكمال المنهج اضغط زر إكمال المنهج داخل المنصة.</p>`);
  res.json({ ok: true });
});

app.post("/api/student/:id/complete-curriculum", async (req, res) => {
  db.prepare("UPDATE requests SET status='أكمل المتدرب المنهج / بانتظار تفعيل الامتحان', course_done=1 WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/trainer/:id/enable-exam", requireRole, async (req, res) => {
  if (req.role !== "trainer" && req.role !== "admin") return res.status(403).json({ error: "Trainer only" });
  const r = db.prepare("SELECT * FROM requests WHERE id=?").get(req.params.id);
  db.prepare("UPDATE requests SET status='الامتحان متاح للمتدرب', exam_enabled=1 WHERE id=?").run(req.params.id);
  db.prepare("UPDATE exams SET visible=1 WHERE course_id=?").run(r.course_id);
  await sendMail(r.email, "تم تفعيل الامتحان", `<p>تم تفعيل امتحان دورة: <b>${r.course_title}</b>.</p><p>يمكنك الدخول إلى المنصة وأداء الامتحان.</p>`);
  res.json({ ok: true });
});

app.get("/api/exams/visible", (req, res) => {
  const exams = db.prepare("SELECT * FROM exams WHERE visible=1").all().map(e => ({ ...e, questions: JSON.parse(e.questions_json) }));
  res.json(exams);
});

app.get("/api/exams", requireRole, (req, res) => {
  const exams = db.prepare("SELECT * FROM exams ORDER BY id DESC").all().map(e => ({ ...e, questions: JSON.parse(e.questions_json) }));
  res.json(exams);
});

app.post("/api/exams", requireRole, (req, res) => {
  if (req.role !== "trainer" && req.role !== "admin") return res.status(403).json({ error: "Trainer only" });
  const e = req.body;
  const course = db.prepare("SELECT * FROM courses WHERE id=?").get(e.course_id);
  const info = db.prepare("INSERT INTO exams (title,course_id,course_title,visible,questions_json) VALUES (?,?,?,?,?)")
    .run(e.title, e.course_id, course?.title || "", e.visible ? 1 : 0, JSON.stringify(e.questions || []));
  res.json({ id: info.lastInsertRowid });
});

app.post("/api/submissions", async (req, res) => {
  const s = req.body;
  const exam = db.prepare("SELECT * FROM exams WHERE id=?").get(s.exam_id);
  const info = db.prepare(`INSERT INTO submissions 
    (request_id,student_name,student_ref,email,exam_id,exam_title,course_title,answers_json,status)
    VALUES (?,?,?,?,?,?,?,?,'مرسل للمدرب')`)
    .run(s.request_id || null, s.student_name, s.student_ref, s.email, s.exam_id, exam?.title || "", exam?.course_title || "", JSON.stringify(s.answers || []));
  await sendMail(s.email, "تم تسليم الامتحان", `<p>تم تسليم امتحانك بنجاح. رقم التسليم: ${info.lastInsertRowid}</p>`);
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.get("/api/submissions", requireRole, (req, res) => {
  res.json(db.prepare("SELECT * FROM submissions ORDER BY id DESC").all());
});

app.post("/api/submissions/:id/auto-correct", requireRole, (req, res) => {
  if (req.role !== "trainer" && req.role !== "admin") return res.status(403).json({ error: "Trainer only" });
  const s = db.prepare("SELECT * FROM submissions WHERE id=?").get(req.params.id);
  const exam = db.prepare("SELECT * FROM exams WHERE id=?").get(s.exam_id);
  const answers = JSON.parse(s.answers_json);
  const questions = JSON.parse(exam.questions_json);
  let score = 0, total = 0;
  questions.forEach((q, i) => { total += Number(q.points || 0); if (answers[i] === q.correct) score += Number(q.points || 0); });
  db.prepare("UPDATE submissions SET score=?, feedback=?, status='مصَحح تلقائيًا' WHERE id=?")
    .run(String(score), `تم التصحيح تلقائيًا. الدرجة من ${total}.`, req.params.id);
  res.json({ ok: true, score, total });
});

app.post("/api/submissions/:id/manual-correct", requireRole, (req, res) => {
  if (req.role !== "trainer" && req.role !== "admin") return res.status(403).json({ error: "Trainer only" });
  db.prepare("UPDATE submissions SET score=?, feedback=?, status='مصَحح يدويًا' WHERE id=?")
    .run(String(req.body.score), req.body.feedback || "", req.params.id);
  res.json({ ok: true });
});

app.post("/api/submissions/:id/certificate", requireRole, async (req, res) => {
  if (req.role !== "trainer" && req.role !== "admin") return res.status(403).json({ error: "Trainer only" });
  const s = db.prepare("SELECT * FROM submissions WHERE id=?").get(req.params.id);
  if (!s || s.score === "لم يصحح") return res.status(400).json({ error: "يجب تصحيح الامتحان أولًا" });
  const certNo = `NCM-LMS-${1001 + db.prepare("SELECT COUNT(*) AS c FROM certificates").get().c}`;
  db.prepare("INSERT INTO certificates (cert_no,name,email,course_title,score,feedback,hr_linked) VALUES (?,?,?,?,?,?,1)")
    .run(certNo, s.student_name, s.email, s.course_title, s.score, s.feedback || "");
  db.prepare("UPDATE submissions SET status='شهادة صادرة / مرتبطة بـ HR' WHERE id=?").run(req.params.id);
  await sendMail(s.email, "صدور شهادتك التدريبية", `<p>تم إصدار شهادتك.</p><p>رقم الشهادة: <b>${certNo}</b></p><p>الدورة: ${s.course_title}</p><p>الدرجة: ${s.score}</p>`);
  res.json({ ok: true, certNo });
});

app.get("/api/certificates", (req, res) => {
  res.json(db.prepare("SELECT * FROM certificates ORDER BY id DESC").all());
});

app.get("/api/certificates/:certNo", (req, res) => {
  const c = db.prepare("SELECT * FROM certificates WHERE cert_no=?").get(req.params.certNo);
  if (!c) return res.status(404).json({ error: "غير موجود" });
  res.json(c);
});

app.listen(PORT, () => {
  console.log(`NCM LMS V7 running on ${BASE_URL}`);
});
