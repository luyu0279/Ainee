/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Flashcard } from './Flashcard';
import type { FlashcardMetadata } from './FlashcardMetadata';
export type FlashcardGenerationResult = {
    /**
     * Whether the generation was successful
     */
    success: boolean;
    /**
     * List of generated flashcards
     */
    flashcards?: (Array<Flashcard> | null);
    /**
     * Metadata about the generation
     */
    metadata?: (FlashcardMetadata | null);
    /**
     * Error message if generation failed
     */
    error?: (string | null);
    /**
     * Error code if generation failed
     */
    errorCode?: (string | null);
};

