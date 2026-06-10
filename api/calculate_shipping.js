export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { postalCode } = req.body;
  
  if (!postalCode) {
    return res.status(400).json({ error: 'Código postal requerido' });
  }

  const cp = parseInt(postalCode, 10);

  // Laguna Larga (5974), Oncativo (5986), Oliva (5998)
  if ([5974, 5986, 5998].includes(cp)) {
    return res.status(200).json({
      options: [
        { 
          id: 'local_viernes', 
          name: 'Envío Gratis (Entregas los Viernes)', 
          cost: 0, 
          type: 'local' 
        }
      ]
    });
  }

  // Río Segundo (5960), Pilar (5970)
  if ([5960, 5970].includes(cp)) {
    return res.status(200).json({
      options: [
        { 
          id: 'local_coordinar', 
          name: 'Envío Gratis (Entrega a coordinar por WhatsApp)', 
          cost: 0, 
          type: 'local' 
        }
      ]
    });
  }

  // Resto del País
  return res.status(200).json({
    options: [
      { 
        id: 'correo_coordinar', 
        name: 'Envío por Correo (Costo a coordinar por WhatsApp)', 
        cost: 0, 
        type: 'nacional' 
      },
      { 
        id: 'retiro_local', 
        name: 'Retiro por nuestro Local', 
        cost: 0, 
        type: 'retiro' 
      }
    ]
  });
}
