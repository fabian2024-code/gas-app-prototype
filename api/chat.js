
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { messages } = req.body;
        if (!messages) {
            return res.status(400).json({ error: 'No messages provided' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(200).json({ 
                error: 'API Key no configurada', 
                botResponse: '🔌 ¡Hola! El administrador aún no ha configurado la variable de entorno GEMINI_API_KEY en los ajustes de Vercel.' 
            });
        }

        // Usamos gemini-2.5-flash y v1beta como verificamos anteriormente
        const sysPrompt = `Eres el asistente inteligente de ventas de GasControl, distribuidor oficial de Gasco.
Vendes cilindros de 5 kg ($5,200), 11 kg ($9,800), 15 kg ($12,500) y 45 kg ($32,000).
REGLAS DE PRECIO:
- Todo pedido tiene un costo de despacho fijo de $1,500.
- Si el cliente es "Adulto Mayor", aplícale un 10% de descuento sobre el precio del cilindro (no sobre el despacho).
- Si es su primer pedido, regálale un bono de -$2,000 de descuento total.
Tu personalidad es amable, profesional y rápida. Usas emojis naturales. Jamás inventes productos ni precios diferentes. Siempre menciona el total desglosado (Cilindro + Despacho - Descuento).
Para completar un pedido necesitas 3 datos obligatorios:
1) Tamaño del cilindro.
2) Dirección exacta.
3) Teléfono.
Cuando tengas la confirmación de esos datos y el cliente acepte el precio total, finaliza reproduciendo EXACTAMENTE Y ÚNICAMENTE este bloque JSON:
{"action": "ORDER", "product": "[TAMAÑO]", "address": "[DIRECCION]", "phone": "[TELEFONO]", "total": "[TOTAL_CALCULADO]"}`;

        const fakeHistory = [
            { role: "user", parts: [{ text: "INSTRUCCIÓN DEL SISTEMA: " + sysPrompt }] },
            { role: "model", parts: [{ text: "Entendido perfectamente. Actuaré estrictamente como el vendedor de GasControl detallado en la instrucción." }] }
        ];

        const data = {
            contents: [...fakeHistory, ...messages],
            generationConfig: { temperature: 0.3 }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try { errorData = JSON.parse(errorText); } catch(e) { errorData = errorText; }
            return res.status(500).json({ error: 'Error del servidor IA', details: errorData });
        }

        const json = await response.json();
        const botText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return res.status(200).json({ botResponse: botText.trim() });

    } catch (e) {
        return res.status(500).json({ error: 'Excepción en el servidor', details: e.message });
    }
}
