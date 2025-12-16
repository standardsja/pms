/**
 * Input Validation and Sanitization
 * Production-ready validation schemas and middleware
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { BadRequestError } from './errorHandler.js';

// Common validation schemas
const emailSchema = z.string().email().max(255);
const nameSchema = z.string().min(1).max(255).trim();
const passwordSchema = z.string().min(8).max(128);

// Authentication schemas
export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

// Idea schemas
export const createIdeaSchema = z.object({
    title: z.string().min(1).max(200).trim(),
    description: z.string().min(10).max(5000).trim(),
    category: z.enum(['PROCESS_IMPROVEMENT', 'TECHNOLOGY', 'CUSTOMER_SERVICE', 'SUSTAINABILITY', 'COST_REDUCTION', 'PRODUCT_INNOVATION', 'OTHER']),
    isAnonymous: z.boolean().optional(),
    tagIds: z.string().optional(),
});

export const voteSchema = z.object({
    voteType: z.enum(['UPVOTE', 'DOWNVOTE']),
});

export const approveRejectIdeaSchema = z.object({
    notes: z.string().max(1000).optional(),
});

export const promoteIdeaSchema = z.object({
    projectCode: z.string().min(1).max(50).optional(),
});

// Comment schemas
export const createCommentSchema = z.object({
    text: z.string().min(1).max(1000).trim(),
    parentId: z.number().optional(),
});

// Request schemas
export const createRequestSchema = z.object({
    title: z.string().min(1).max(200).trim(),
    description: z.string().max(5000).optional(),
    departmentId: z.number().positive(),
    totalEstimated: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    expectedDelivery: z.string().datetime().optional(),
    items: z
        .array(
            z.object({
                description: z.string().min(1).max(500),
                quantity: z.number().positive(),
                unitPrice: z.number().min(0),
                totalPrice: z.number().min(0),
                accountCode: z.string().max(50).optional(),
                unitOfMeasure: z.string().max(50).optional(),
                partNumber: z.string().max(100).optional(),
            })
        )
        .optional(),
});

/**
 * Validation middleware factory
 */
export function validate(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const validated = schema.parse(req.body);
            req.body = validated;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const message = (error as any).errors?.map((err: any) => `${err.path.join('.')}: ${err.message}`).join('; ') || error.message;
                throw new BadRequestError(`Validation failed: ${message}`);
            }
            next(error);
        }
    };
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote'],
        ALLOWED_ATTR: [],
    });
}

/**
 * General input sanitization middleware
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
    function sanitizeObject(obj: any): any {
        if (typeof obj === 'string') {
            return obj.trim();
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }
        if (obj && typeof obj === 'object') {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitizeObject(value);
            }
            return sanitized;
        }
        return obj;
    }

    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }

    next();
}
