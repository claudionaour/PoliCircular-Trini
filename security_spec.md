# Especificación de Seguridad Firestore — PoliCircular

## 1. Invariantes de Datos
1. **Principio Cero Dinero:** Ninguna colección ni documento admite campos de precio, pago o compraventa.
2. **Aislamiento de PII:** Correos electrónicos privados, teléfonos y tokens FCM se almacenan únicamente en `/users/{userId}/private/{contactDoc}` (accesible solo por el propietario o administradores verificados). El documento público `/users/{userId}` no contiene PII.
3. **Roles RBAC Protegidos:** Ningún usuario puede escribir ni escalar sus propios privilegios en `/user_roles/{userId}`. Solo `super_admin` o Cloud Functions pueden asignar roles (`user`, `moderator`, `admin`, `super_admin`).
4. **Moderación Previa Obligatoria:** Toda publicación nueva en `/products/{productId}` debe nacer con `status == 'pending'`, `available_quantity == total_quantity`, `reserved_quantity == 0` y `owner_id == request.auth.uid`. Solo moderadores/administradores pueden transicionar a `approved`, `rejected` o `suspended`.
5. **Confirmación Bilateral e Integridad del Árbol e Impacto:** El progreso en `/user_tree_progress/{userId}` e `/impact_records/{impactId}` solo puede incrementarse cuando ambas partes confirman en `/exchange_confirmations/{confirmationId}` y la operación alcanza `status == 'completed'`.
6. **Participación Estricta en Chats y Entregas:** Solo `participant_a` y `participant_b` (o administradores) pueden leer o escribir en `/conversations`, `/messages`, `/exchanges` y `/exchange_confirmations`.
7. **Inmutabilidad de Mensajes:** El campo `body`, `sender_id` y `conversation_id` de `/messages/{messageId}` son inmutables tras la creación; los destinatarios solo pueden actualizar `is_read` y `read_at`.

## 2. "Dirty Dozen" Payloads (Pruebas Adversarias)
1. **Self-Role Escalation:** Usuario normal intenta crear `/user_roles/{uid}` con `roles: ['super_admin']` -> `PERMISSION_DENIED`.
2. **Auto-Aprobación de Producto:** Usuario normal intenta crear `/products/{id}` con `status: 'approved'` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection:** Usuario intenta crear `/products/{id}` agregando campo fantasma `price_clp: 15000` o `isVerified: true` -> `PERMISSION_DENIED` (`hasOnly`).
4. **Lectura de PII Ajena:** Usuario autenticado A intenta leer `/users/{userB}/private/contact` -> `PERMISSION_DENIED`.
5. **Suplantación de Autor en Mensaje:** Usuario A intenta crear mensaje en `/messages/{id}` con `sender_id: userB` -> `PERMISSION_DENIED`.
6. **Mutación de Contenido de Mensaje:** Participante intenta modificar `body` en `/messages/{id}` durante `update` -> `PERMISSION_DENIED`.
7. **Lectura de Chat Ajeno:** Usuario C intenta listar `/messages` de conversación entre A y B -> `PERMISSION_DENIED`.
8. **Auto-Incremento de Árbol Circular:** Usuario intenta incrementar `completed_operations` directamente en `/user_tree_progress/{uid}` sin confirmación bilateral -> `PERMISSION_DENIED`.
9. **ID Poisoning:** Atacante intenta crear `/products/{junk_id_150_chars}` con caracteres inválidos o longitud > 128 -> `PERMISSION_DENIED` (`isValidId`).
10. **Usuario No Verificado:** Usuario con `email_verified == false` intenta publicar en `/products` o enviar mensajes -> `PERMISSION_DENIED`.
11. **Modificación de Registro de Auditoría:** Usuario o moderador intenta borrar o alterar `/moderation_logs/{id}` -> `PERMISSION_DENIED`.
12. **Reseña Falsificada antes de Completar:** Usuario intenta crear `/reviews/{id}` sobre un intercambio que aún está `coordinating` -> `PERMISSION_DENIED`.
