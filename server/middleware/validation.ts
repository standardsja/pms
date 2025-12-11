/**
 * Input Validation and Sanitization
 * Production-ready validation schemas and middleware
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { BadRequestError } from './errorHandler';

// Common validation schemas
const emailSchema = z.string().email().max(255);
const nameSchema = z.string().min(1).max(255).trim();
const passwordSchema = z.string().min(8).max(128);

// Authentication schemas
export const loginSchema = z.object({
    body: z.object({
        email: emailSchema,
        password: passwordSchema,
    }),
});

// Idea schemas
export const createIdeaSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(200).trim(),
        description: z.string().min(10).max(5000).trim(),
        category: z.enum(['PROCESS_IMPROVEMENT', 'TECHNOLOGY', 'CUSTOMER_SERVICE', 'SUSTAINABILITY', 'COST_REDUCTION', 'PRODUCT_INNOVATION', 'OTHER']),
        isAnonymous: z.boolean().optional(),
        tagIds: z.string().optional(),
    }),
});

export const voteSchema = z.object({
    body: z.object({
        voteType: z.enum(['UPVOTE', 'DOWNVOTE']),
    }),
});

export const approveRejectIdeaSchema = z.object({
    body: z.object({
        notes: z.string().max(1000).optional(),
    }),
});

export const promoteIdeaSchema = z.object({
    body: z.object({
        projectCode: z.string().min(3).max(50).optional(),
    }),
});

export const ideaCommentSchema = z.object({
    body: z.object({
        content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
    }),
});

/**
 * Validation schemas for Procurement/Request endpoints
 */

export const createRequestSchema = z.object({
    body: z.object({
        title: z.string().min(5, 'Title must be at least 5 characters').max(200),
        description: z.string().optional(),
        departmentId: z.number().int().positive(),
        items: z
            .array(
                z.object({
                    description: z.string().min(1),
                    quantity: z.number().int().positive().default(1),
                    unitPrice: z.number().nonnegative().default(0),
                    totalPrice: z.number().nonnegative().default(0),
                    accountCode: z.string().optional(),
                    stockLevel: z.string().optional(),
                    unitOfMeasure: z.string().optional(),
                    partNumber: z.string().optional(),
                })
            )
            .optional(),
        totalEstimated: z.number().nonnegative().optional(),
        currency: z.string().max(3).default('JMD'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        procurementType: z.any().optional(),
        expectedDelivery: z.string().datetime().optional(),
    }),
});

export const requestActionSchema = z.object({
    body: z.object({
        action: z.enum(['APPROVE', 'REJECT', 'SEND_TO_VENDOR']),
        comment: z.string().max(1000).optional(),
    }),
});

/**
 * Generic validation middleware factory
 * Validates request against a Zod schema and returns 400 if invalid
 */
export function validate(schema: z.ZodTypeAny) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Invalid request data',
                    details: error.issues.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            next(error);
        }
    };
}

/**
 * Sanitize input to prevent common injection attacks
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
    const sanitize = (obj: any): any => {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (typeof obj === 'string') {
            // Remove null bytes and trim
            return obj.replace(/\0/g, '').trim();
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        if (typeof obj === 'object') {
            const sanitized: any = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    sanitized[key] = sanitize(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    };

    try {
        if (req.body) {
            req.body = sanitize(req.body);
        }
        if (req.query) {
            req.query = sanitize(req.query) as any;
        }
        if (req.params) {
            req.params = sanitize(req.params) as any;
        }
        next();
    } catch (error) {
        next(error);
    }
}
