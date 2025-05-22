/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TeacherThankYouNoteRequest = {
    /**
     * Who is this from? (e.g., Parent, Student, Class Group, School Administration)
     */
    from_whom?: (string | null);
    /**
     * Teacher's name (will be used in greeting, e.g., 'Dear Mrs. Smith,')
     */
    teacher_name?: (string | null);
    /**
     * Your name (will be used in closing)
     */
    your_name?: (string | null);
    /**
     * Type of teacher (e.g., Elementary School Teacher, Daycare Teacher)
     */
    teacher_type?: (string | null);
    /**
     * Qualities appreciated in the teacher (e.g., Patience, Creativity, Dedication)
     */
    qualities?: (string | null);
    /**
     * Optional specific memory or achievement to mention
     */
    memory?: (string | null);
    /**
     * Desired tone of the note (e.g., Heartfelt, Formal, Casual, Humorous, Inspirational)
     */
    tone?: (string | null);
    /**
     * Desired length of the note (Short, Medium, Detailed)
     */
    length?: (string | null);
};

