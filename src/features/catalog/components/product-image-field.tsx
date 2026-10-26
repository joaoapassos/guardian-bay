"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { type ProductImageDto, productImage } from "../images";
import { ProductImage } from "./product-image";

export function ProductImageField({
  image,
  disabled,
  onChange,
  onBlocked,
}: {
  image: ProductImageDto;
  disabled: boolean;
  onChange: (id: string | null, image: ProductImageDto) => void;
  onBlocked: (blocked: boolean) => void;
}) {
  const request = useRef<XMLHttpRequest | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => () => request.current?.abort(), []);
  function cancel() {
    request.current?.abort();
    request.current = null;
    setProgress(null);
    setFailed(false);
    setMessage("Seleção cancelada. A imagem anterior foi preservada.");
    onBlocked(false);
    if (input.current) input.current.value = "";
  }
  function upload(file: File) {
    request.current?.abort();
    setProgress(0);
    setMessage("Enviando imagem…");
    setFailed(false);
    onBlocked(true);
    const xhr = new XMLHttpRequest();
    request.current = xhr;
    xhr.open("POST", "/api/admin/product-images");
    xhr.responseType = "json";
    xhr.timeout = 45000;
    xhr.upload.onprogress = (event) => {
      if (request.current === xhr && event.lengthComputable)
        setProgress(Math.round((event.loaded / event.total) * 100));
    };
    const fail = () => {
      if (request.current !== xhr) return;
      request.current = null;
      setProgress(null);
      setFailed(true);
      setMessage(
        "Não foi possível enviar. Use JPEG, PNG ou WebP estático de até 5 MiB e 20 MP. Tente novamente ou cancele a seleção.",
      );
      onBlocked(true);
    };
    xhr.onerror = fail;
    xhr.ontimeout = fail;
    xhr.onload = () => {
      if (request.current !== xhr) return;
      const parsed = z
        .object({
          success: z.literal(true),
          mediaId: z.uuid(),
          image: z.object({
            id: z.uuid(),
            kind: z.literal("upload"),
            width: z.number(),
            height: z.number(),
          }),
        })
        .safeParse(xhr.response);
      if (
        xhr.status !== 201 ||
        !parsed.success ||
        parsed.data.mediaId !== parsed.data.image.id
      ) {
        fail();
        return;
      }
      const preview = productImage(null, "Prévia da imagem do produto", {
        ...parsed.data.image,
        origin: "upload",
      });
      if (preview.kind === "none") {
        fail();
        return;
      }
      request.current = null;
      setProgress(null);
      onBlocked(false);
      onChange(parsed.data.mediaId, preview);
      setMessage("Imagem pronta. Salve o produto para confirmar.");
    };
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  }
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="font-semibold">Imagem do produto</legend>
      <p className="text-sm text-muted" id="product-image-help">
        Um arquivo JPEG, PNG ou WebP estático. Até 5 MiB e 20 megapixels.
      </p>
      <div className="max-w-48">
        <ProductImage image={image} size="thumbnail" />
      </div>
      <label className="block">
        {image.kind === "none" ? "Adicionar imagem" : "Substituir imagem"}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          name="productImage"
          aria-describedby="product-image-help"
          className="mt-2 block max-w-full"
          disabled={disabled || progress !== null}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) upload(file);
          }}
        />
      </label>
      {progress !== null && (
        <progress
          value={progress}
          max={100}
          aria-label="Envio da imagem"
          className="w-full"
        />
      )}
      {(progress !== null || failed) && (
        <Button onClick={cancel}>Cancelar seleção</Button>
      )}
      {image.kind !== "none" && progress === null && !failed && (
        <Button
          onClick={() => {
            if (input.current) input.current.value = "";
            onChange(null, productImage(null, "Produto"));
            setMessage("Imagem removida da seleção. Salve para confirmar.");
          }}
        >
          Remover imagem
        </Button>
      )}
      <output aria-live="polite" className="block text-sm">
        {message}
      </output>
    </fieldset>
  );
}
