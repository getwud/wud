
declare module 'joi-cron-expression' {
    import Joi, { StringSchema } from 'joi';

    export default function joiCronExpression(joi: Joi.Root): Root;

    interface StringWithCronSchema<TSchema = string> extends StringSchema<TSchema> {
        cron(): this;
    }

    interface Root extends Joi.Root {
        string<TSchema = string>(): StringWithCronSchema<TSchema>;
    }
}