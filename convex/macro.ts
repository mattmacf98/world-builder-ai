import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const createMacro = mutation(async (ctx, { name, macroStorageId, activationPhrases, actions }: { name: string, macroStorageId: string, activationPhrases: string[], actions: string[] }) => {
    return await ctx.db.insert("macros", { name, macroStorageId, activationPhrases, actions, createdAt: Date.now() });
});

export const getMacros = query(async (ctx) => {
    const macros = await ctx.db.query("macros").collect();  
    for (const macro of macros) {
        macro.macroUrl = (await ctx.storage.getUrl(macro.macroStorageId))!;
    }
    return macros;
});

export const getMacro = query(async (ctx, { id }: { id: Id<"macros"> }) => {
    const macro = await ctx.db.get(id);
    if (macro) {
        macro.macroUrl = (await ctx.storage.getUrl(macro.macroStorageId))!;
    }
    return macro;
});
