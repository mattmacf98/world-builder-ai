import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const createMacro = mutation(async (ctx, { name, macroStorageId, activationPhrases }: { name: string, macroStorageId: string, activationPhrases: string[] }) => {
    return await ctx.db.insert("macros", { name, macroStorageId, activationPhrases, createdAt: Date.now() });
});

export const getMacros = query(async (ctx) => {
    return await ctx.db.query("macros").collect();
});

export const getMacro = query(async (ctx, { id }: { id: Id<"macros"> }) => {
    const macro = await ctx.db.get(id);
    if (macro) {
        macro.macroUrl = (await ctx.storage.getUrl(macro.macroStorageId))!;
    }
    return macro;
});
