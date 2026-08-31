import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/modules/authentication/actions";
import { getStorageService } from "@/lib/storage";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Only PNG, JPG, JPEG, and SVG are supported." }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const storageService = getStorageService();
        
        try {
            const fileUrl = await storageService.uploadAvatar(buffer, file.name, file.type);
            return NextResponse.json({ url: fileUrl });
        } catch (uploadError: any) {
            return NextResponse.json({ error: uploadError.message }, { status: 400 });
        }
    } catch (error: any) {
        console.error("Avatar upload error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
