exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const input = JSON.parse(event.body);
        if (!input.messages) return { statusCode: 400, body: JSON.stringify({ error: 'No messages provided' }) };

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { 
                statusCode: 200, 
                body: JSON.stringify({ 
                    error: 'API Key no configurada', 
                    botResponse: '🔌 ¡Hola! El administrador aún no ha configurado la variable de entorno GEMINI_API_KEY en los ajustes de Netlify.' 
                }) 
            };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        
        const sysPrompt = `Eres el asistente inteligente de ventas de GasControl, distribuidor oficial de Gasco.
Vendes cilindros de 5 kg ($5,200), 11 kg ($9,800), 15 kg ($12,500) y 45 kg ($32,000).
Tu personalidad es amable, profesional y rápida. Usas emojis naturales. Jamás inventes productos ni precios diferentes.
Para completar un pedido necesitas 3 datos obligatorios del cliente:
1) El tamaño del cilindro.
2) La dirección de entrega exacta.
3) Un número de teléfono de contacto.
Pregunta estos datos paso a paso conversando con el cliente de forma natural, no le tires todas las preguntas de una sola vez. Cuando inicie la venta pregunta el tamaño. Cuando tengas el tamaño, pregunta direccion. Cuando tengas la direccion, pregunta el telefono.
Cuando tengas la confirmación de esos 3 datos, finaliza el proceso reproduciendo EXACTAMENTE Y ÚNICAMENTE este bloque JSON, sin escribir ni una sola letra o saludo extra antes ni después de las llaves:
{"action": "ORDER", "product": "[TAMAÑO]", "address": "[DIRECCION]", "phone": "[TELEFONO]"}`;

        const fakeHistory = [
            { role: "user", parts: [{ text: "INSTRUCCIÓN DEL SISTEMA: " + sysPrompt }] },
            { role: "model", parts: [{ text: "Entendido perfectamente. Actuaré estrictamente como el vendedor de GasControl detallado en la instrucción." }] }
        ];

        const data = {
            contents: [...fakeHistory, ...input.messages],
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
            return { statusCode: 500, body: JSON.stringify({ error: 'Error del servidor IA', details: errorData }) };
        }

        const json = await response.json();
        const botText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botResponse: botText.trim() })
        };

    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Excepción en el servidor', details: e.message }) };
    }
};
