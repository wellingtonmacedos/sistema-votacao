import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePresignedUploadUrl, getFileUrl } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { fileName, contentType } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "Nome do arquivo e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo (apenas imagens)
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: "Apenas imagens são permitidas" },
        { status: 400 }
      );
    }

    // Gerar URL de upload presigned (público para imagens de perfil)
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      true // isPublic
    );

    // Gerar URL pública final
    const publicUrl = getFileUrl(cloud_storage_path, true);

    return NextResponse.json({
      uploadUrl,
      cloud_storage_path,
      publicUrl
    });
  } catch (error) {
    console.error('Erro ao gerar URL de upload:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
