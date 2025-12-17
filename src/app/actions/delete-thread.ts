'use server';

import { deleteThread } from "@/lib/db-queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function removeThread(id: string, shouldRedirect: boolean = false) {
    deleteThread(id);
    revalidatePath("/");
    if (shouldRedirect) {
        redirect("/");
    }
}



