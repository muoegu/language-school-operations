CREATE TYPE "public"."attendance_status" AS ENUM('present', 'late', 'absent');--> statement-breakpoint
CREATE TYPE "public"."lesson_participation_status" AS ENUM('scheduled', 'attended', 'absent', 'cancelled', 'late');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('scheduled', 'completed', 'absent', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lesson_teacher_role" AS ENUM('primary', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."payment_record_status" AS ENUM('active', 'used_up', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."textbook_status" AS ENUM('selling', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('representative', 'teacher', 'staff');--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"attendance_date" timestamp NOT NULL,
	"clock_in_at" timestamp with time zone,
	"clock_out_at" timestamp with time zone,
	"status" "attendance_status" DEFAULT 'present' NOT NULL,
	"note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_records_clock_out_after_clock_in" CHECK ("attendance_records"."clock_out_at" is null or "attendance_records"."clock_in_at" is null or "attendance_records"."clock_out_at" >= "attendance_records"."clock_in_at"),
	CONSTRAINT "attendance_records_note_not_blank" CHECK ("attendance_records"."note" is null or length(trim("attendance_records"."note")) > 0)
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"level" varchar(30) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'JPY' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_name_not_blank" CHECK (length(trim("classes"."name")) > 0),
	CONSTRAINT "classes_level_not_blank" CHECK (length(trim("classes"."level")) > 0),
	CONSTRAINT "classes_duration_positive" CHECK ("classes"."duration_minutes" > 0),
	CONSTRAINT "classes_price_nonnegative" CHECK ("classes"."price_minor" >= 0),
	CONSTRAINT "classes_currency_iso_code" CHECK ("classes"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "lesson_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"recorded_by_user_id" uuid,
	"completed_at" timestamp with time zone,
	"actual_start_at" timestamp with time zone,
	"actual_end_at" timestamp with time zone,
	"note" text,
	"next_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_records_actual_time_order" CHECK ("lesson_records"."actual_end_at" > "lesson_records"."actual_start_at"),
	CONSTRAINT "lesson_records_actual_time_pair" CHECK (("lesson_records"."actual_start_at" is null and "lesson_records"."actual_end_at" is null) or ("lesson_records"."actual_start_at" is not null and "lesson_records"."actual_end_at" is not null)),
	CONSTRAINT "lesson_records_note_not_blank" CHECK ("lesson_records"."note" is null or length(trim("lesson_records"."note")) > 0),
	CONSTRAINT "lesson_records_next_content_not_blank" CHECK ("lesson_records"."next_content" is null or length(trim("lesson_records"."next_content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "lesson_students" (
	"lesson_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"participation_status" "lesson_participation_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_students_lesson_id_student_id_pk" PRIMARY KEY("lesson_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_teachers" (
	"lesson_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"role" "lesson_teacher_role" DEFAULT 'primary' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_teachers_lesson_id_teacher_id_pk" PRIMARY KEY("lesson_id","teacher_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid,
	"teacher_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"title" varchar(150) NOT NULL,
	"level" varchar(30),
	"scheduled_start_at" timestamp with time zone NOT NULL,
	"scheduled_end_at" timestamp with time zone NOT NULL,
	"status" "lesson_status" DEFAULT 'scheduled' NOT NULL,
	"status_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_title_not_blank" CHECK (length(trim("lessons"."title")) > 0),
	CONSTRAINT "lessons_status_reason_not_blank" CHECK ("lessons"."status_reason" is null or length(trim("lessons"."status_reason")) > 0),
	CONSTRAINT "lessons_scheduled_time_order" CHECK ("lessons"."scheduled_end_at" > "lessons"."scheduled_start_at")
);
--> statement-breakpoint
CREATE TABLE "payment_record_lessons" (
	"payment_record_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_record_lessons_payment_record_id_lesson_id_pk" PRIMARY KEY("payment_record_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "payment_record_textbooks" (
	"payment_record_id" uuid NOT NULL,
	"textbook_id" uuid NOT NULL,
	"price_minor_snapshot" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_record_textbooks_payment_record_id_textbook_id_pk" PRIMARY KEY("payment_record_id","textbook_id"),
	CONSTRAINT "payment_record_textbooks_price_nonnegative" CHECK ("payment_record_textbooks"."price_minor_snapshot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid,
	"purchased_at" timestamp with time zone NOT NULL,
	"due_date" timestamp,
	"lesson_amount_minor" integer NOT NULL,
	"textbook_amount_minor" integer DEFAULT 0 NOT NULL,
	"total_amount_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'JPY' NOT NULL,
	"status" "payment_record_status" DEFAULT 'active' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_records_lesson_amount_nonnegative" CHECK ("payment_records"."lesson_amount_minor" >= 0),
	CONSTRAINT "payment_records_textbook_amount_nonnegative" CHECK ("payment_records"."textbook_amount_minor" >= 0),
	CONSTRAINT "payment_records_total_amount_nonnegative" CHECK ("payment_records"."total_amount_minor" >= 0),
	CONSTRAINT "payment_records_total_amount_matches_parts" CHECK ("payment_records"."total_amount_minor" = "payment_records"."lesson_amount_minor" + "payment_records"."textbook_amount_minor"),
	CONSTRAINT "payment_records_due_date_not_before_purchase" CHECK ("payment_records"."due_date" is null or "payment_records"."due_date" >= ("payment_records"."purchased_at")::date),
	CONSTRAINT "payment_records_currency_iso_code" CHECK ("payment_records"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "payment_records_updated_after_created" CHECK ("payment_records"."updated_at" >= "payment_records"."created_at")
);
--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"display_name" varchar(100) NOT NULL,
	"department" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_members_display_name_not_blank" CHECK (length(trim("staff_members"."display_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"birth_date" timestamp,
	"level" varchar(30),
	"class_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_display_name_not_blank" CHECK (length(trim("students"."display_name")) > 0),
	CONSTRAINT "students_level_not_blank" CHECK ("students"."level" is null or length(trim("students"."level")) > 0),
	CONSTRAINT "students_email_format" CHECK ("students"."email" is null or "students"."email" ~ '^[^[:space:]@]+@[^[:space:]@]+$')
);
--> statement-breakpoint
CREATE TABLE "teacher_student_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_student_assignments_end_after_start" CHECK ("teacher_student_assignments"."ended_at" is null or "teacher_student_assignments"."ended_at" >= "teacher_student_assignments"."assigned_at"),
	CONSTRAINT "teacher_student_assignments_inactive_has_end" CHECK ("teacher_student_assignments"."is_active" = true or "teacher_student_assignments"."ended_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"display_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"employment_start_date" date DEFAULT now() NOT NULL,
	"employment_end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teachers_display_name_not_blank" CHECK (length(trim("teachers"."display_name")) > 0),
	CONSTRAINT "teachers_email_format" CHECK ("teachers"."email" is null or "teachers"."email" ~ '^[^[:space:]@]+@[^[:space:]@]+$'),
	CONSTRAINT "teachers_employment_dates_valid" CHECK ("teachers"."employment_end_date" is null or "teachers"."employment_end_date" >= "teachers"."employment_start_date")
);
--> statement-breakpoint
CREATE TABLE "textbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"publisher" varchar(150) NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'JPY' NOT NULL,
	"status" textbook_status DEFAULT 'selling' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "textbooks_title_not_blank" CHECK (length(trim("textbooks"."title")) > 0),
	CONSTRAINT "textbooks_publisher_not_blank" CHECK (length(trim("textbooks"."publisher")) > 0),
	CONSTRAINT "textbooks_price_nonnegative" CHECK ("textbooks"."price_minor" >= 0),
	CONSTRAINT "textbooks_currency_iso_code" CHECK ("textbooks"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_user_id" varchar(255),
	"email" varchar(255),
	"display_name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_display_name_not_blank" CHECK (length(trim("users"."display_name")) > 0),
	CONSTRAINT "users_email_format" CHECK ("users"."email" is null or "users"."email" ~ '^[^[:space:]@]+@[^[:space:]@]+$')
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_records" ADD CONSTRAINT "lesson_records_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_records" ADD CONSTRAINT "lesson_records_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_students" ADD CONSTRAINT "lesson_students_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_students" ADD CONSTRAINT "lesson_students_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_teachers" ADD CONSTRAINT "lesson_teachers_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_teachers" ADD CONSTRAINT "lesson_teachers_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_record_lessons" ADD CONSTRAINT "payment_record_lessons_payment_record_id_payment_records_id_fk" FOREIGN KEY ("payment_record_id") REFERENCES "public"."payment_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_record_lessons" ADD CONSTRAINT "payment_record_lessons_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_record_textbooks" ADD CONSTRAINT "payment_record_textbooks_payment_record_id_payment_records_id_fk" FOREIGN KEY ("payment_record_id") REFERENCES "public"."payment_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_record_textbooks" ADD CONSTRAINT "payment_record_textbooks_textbook_id_textbooks_id_fk" FOREIGN KEY ("textbook_id") REFERENCES "public"."textbooks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_student_assignments" ADD CONSTRAINT "teacher_student_assignments_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_student_assignments" ADD CONSTRAINT "teacher_student_assignments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_user_date_unique" ON "attendance_records" USING btree ("user_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_records_user_date_idx" ON "attendance_records" USING btree ("user_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_records_date_status_idx" ON "attendance_records" USING btree ("attendance_date","status");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_name_unique" ON "classes" USING btree ("name");--> statement-breakpoint
CREATE INDEX "classes_active_idx" ON "classes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "classes_active_name_idx" ON "classes" USING btree ("is_active","name");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_records_lesson_id_unique" ON "lesson_records" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_records_recorded_by_user_idx" ON "lesson_records" USING btree ("recorded_by_user_id");--> statement-breakpoint
CREATE INDEX "lesson_records_actual_start_at_idx" ON "lesson_records" USING btree ("actual_start_at");--> statement-breakpoint
CREATE INDEX "lesson_students_student_idx" ON "lesson_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "lesson_students_student_status_idx" ON "lesson_students" USING btree ("student_id","participation_status");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_teachers_primary_unique" ON "lesson_teachers" USING btree ("lesson_id") WHERE "lesson_teachers"."role" = 'primary';--> statement-breakpoint
CREATE INDEX "lesson_teachers_teacher_idx" ON "lesson_teachers" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "lesson_teachers_teacher_role_idx" ON "lesson_teachers" USING btree ("teacher_id","role");--> statement-breakpoint
CREATE INDEX "lessons_class_idx" ON "lessons" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "lessons_scheduled_start_at_idx" ON "lessons" USING btree ("scheduled_start_at");--> statement-breakpoint
CREATE INDEX "lessons_teacher_start_at_idx" ON "lessons" USING btree ("teacher_id","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "lessons_status_start_at_idx" ON "lessons" USING btree ("status","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "lessons_student_start_at_idx" ON "lessons" USING btree ("student_id","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "payment_record_lessons_lesson_idx" ON "payment_record_lessons" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "payment_record_lessons_used_at_idx" ON "payment_record_lessons" USING btree ("used_at");--> statement-breakpoint
CREATE INDEX "payment_record_textbooks_textbook_idx" ON "payment_record_textbooks" USING btree ("textbook_id");--> statement-breakpoint
CREATE INDEX "payment_records_class_idx" ON "payment_records" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_records_student_purchased_at_unique" ON "payment_records" USING btree ("student_id","purchased_at");--> statement-breakpoint
CREATE INDEX "payment_records_student_idx" ON "payment_records" USING btree ("student_id","purchased_at");--> statement-breakpoint
CREATE INDEX "payment_records_status_idx" ON "payment_records" USING btree ("status","payment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_members_user_id_unique" ON "staff_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "staff_members_active_idx" ON "staff_members" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "staff_members_active_name_idx" ON "staff_members" USING btree ("is_active","display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "students_email_unique" ON "students" USING btree ("email");--> statement-breakpoint
CREATE INDEX "students_active_idx" ON "students" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "students_active_name_idx" ON "students" USING btree ("is_active","display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_student_assignments_active_unique" ON "teacher_student_assignments" USING btree ("teacher_id","student_id") WHERE "teacher_student_assignments"."is_active" = true;--> statement-breakpoint
CREATE INDEX "teacher_student_assignments_teacher_idx" ON "teacher_student_assignments" USING btree ("teacher_id","is_active");--> statement-breakpoint
CREATE INDEX "teacher_student_assignments_student_idx" ON "teacher_student_assignments" USING btree ("student_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_user_id_unique" ON "teachers" USING btree ("user_id") WHERE "teachers"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_email_unique" ON "teachers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "teachers_active_idx" ON "teachers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "teachers_active_name_idx" ON "teachers" USING btree ("is_active","display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "textbooks_title_unique" ON "textbooks" USING btree ("title");--> statement-breakpoint
CREATE INDEX "textbooks_status_idx" ON "textbooks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "textbooks_status_title_idx" ON "textbooks" USING btree ("status","title");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_id_unique" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_external_user_id_unique" ON "users" USING btree ("external_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "users_active_name_idx" ON "users" USING btree ("is_active","display_name");