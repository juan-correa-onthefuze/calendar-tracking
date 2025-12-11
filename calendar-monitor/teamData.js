// teamData.js

const TEAM_MEMBERS = [
  // Engineering Team
  { name: 'Andrés Felipe Barón Guzmán', email: 'andres.baron@onthefuze.com', role: 'Engineer' },
  { name: 'Andrés Felipe Peña Santos', email: 'andres.santos@onthefuze.com', role: 'Engineer' },
  { name: 'Juan Camilo Guerrero Lopez', email: 'camilo.guerrero@onthefuze.com', role: 'Engineer' },
  { name: 'Luis Carlos Garcia Garcia', email: 'carlos.garcia@onthefuze.com', role: 'Engineer' },
  { name: 'Carlos Arturo Mendez Neira', email: 'carlos.mendez@onthefuze.com', role: 'Engineer' },
  { name: 'Fabian Hernando Cortes Jamaica', email: 'fabian.cortes@onthefuze.com', role: 'Engineer' },
  { name: 'Juan Pablo Delgado Nivia', email: 'juan.delgado@onthefuze.com', role: 'Engineer' },
  { name: 'Natalia Ortega Gonzalez', email: 'natalia.ortega@onthefuze.com', role: 'Engineer' },
  
  // Software Team
  { name: 'Alejandro Meneses', email: 'alejandro.meneses@onthefuze.com', role: 'Software' },
  { name: 'Andres Eduardo Garcia Bayona', email: 'andres.garcia@onthefuze.com', role: 'Software' },
  { name: 'Byron Miguel Piedrahita Hernández', email: 'byron.piedrahita@onthefuze.com', role: 'Software' },
  { name: 'Camilo Ramirez', email: 'camilo.ramirez@onthefuze.com', role: 'Software' },
  { name: 'Carlos Gutiérrez Flórez', email: 'carlos.florez@onthefuze.com', role: 'Software' },
  { name: 'Carlos Alejandro Orjuela Ortega', email: 'carlos.orjuela@onthefuze.com', role: 'Software' },
  { name: 'Juan David Rivera Calderon', email: 'david.calderon@onthefuze.com', role: 'Software' },
  { name: 'Johan Sebastian Doncel Gonzalez', email: 'johan.doncel@onthefuze.com', role: 'Software' },
  { name: 'Juan Pablo Carvajal García', email: 'juan.carvajal@onthefuze.com', role: 'Software' },
  { name: 'Juan Pablo Pelaez Camacho', email: 'juan.pelaez@onthefuze.com', role: 'Software' },
  { name: 'Leonardo Morales Muguerza', email: 'leonardo.morales@onthefuze.com', role: 'Software' },
  { name: 'Miguel Angel Sanchez Castro', email: 'miguel.sanchez@onthefuze.com', role: 'Software' },
  { name: 'Nicolás González Díaz', email: 'nicolas.gonzalez@onthefuze.com', role: 'Software' },
  { name: 'Norman Eduardo Jaimes Mora', email: 'norman.jaimes@onthefuze.com', role: 'Software' },
  { name: 'Pablo Andres Muñoz Ávila', email: 'pablo.munoz@onthefuze.com', role: 'Software' },
  { name: 'Viviana Romero', email: 'viviana.romero@onthefuze.com', role: 'Software' },

  
  // Consultants
  { name: 'Arturo Herrera', email: 'arturo.herrera@onthefuze.com', role: 'Consultant' },
  { name: 'Daniel Lastra', email: 'daniel.lastra@onthefuze.com', role: 'Consultant' },
  { name: 'Maria Agudelo', email: 'maria.agudelo@onthefuze.com', role: 'Consultant' },
  { name: 'Jose Salgado', email: 'jose.salgado@onthefuze.com', role: 'Consultant' },
  { name: 'Lizeth Pinzon', email: 'lizeth.pinzon@onthefuze.com', role: 'Consultant' },
  { name: 'Daniel Carrasco', email: 'daniel.carrasco@onthefuze.com', role: 'Consultant' },
  { name: 'Valery Puentes', email: 'valery.puentes@onthefuze.com', role: 'Consultant' },
  { name: 'Guido Torres', email: 'guido.torres@onthefuze.com', role: 'Consultant' },
  { name: 'Sebastian Camacho', email: 'sebastian.camacho@onthefuze.com', role: 'Consultant' },
  { name: 'Jeisson Zambrano', email: 'jeisson.zambrano@onthefuze.com', role: 'Consultant' },
  { name: 'Tatiana Rosas', email: 'tatiana.rosas@onthefuze.com', role: 'Consultant' },
  { name: 'Camilo Sarmiento', email: 'camilo.sarmiento@onthefuze.com', role: 'Consultant' },
  { name: 'Sarah Ortiz', email: 'sarah.ortiz@onthefuze.com', role: 'Consultant' },
  { name: 'Maria Becerra', email: 'maria.becerra@onthefuze.com', role: 'Consultant' },
  { name: 'Manuel Wilches', email: 'manuel.wilches@onthefuze.com', role: 'Consultant' },
  { name: 'Sebastian Laguna', email: 'sebastian.laguna@onthefuze.com', role: 'Consultant' },
  { name: 'David Cabrera', email: 'david.cabrera@onthefuze.com', role: 'Consultant' },
  { name: 'Daniela Gamba', email: 'daniela.gamba@onthefuze.com', role: 'Consultant' },
  { name: 'Julian Rubio', email: 'julian.rubio@onthefuze.com', role: 'Consultant' },
  { name: 'Karen Cely', email: 'karen.cely@onthefuze.com', role: 'Consultant' },
  { name: 'Simon Ocampo', email: 'simon.ocampo@onthefuze.com', role: 'Consultant' },
  { name: 'Maria Soraca', email: 'maria.soraca@onthefuze.com', role: 'Consultant' },
  { name: 'Jonatan Diaz', email: 'jonatan.diaz@onthefuze.com', role: 'Consultant' },
  { name: 'Valentina Guzman', email: 'valentina.guzman@onthefuze.com', role: 'Consultant' },
  { name: 'Diego Rodriguez', email: 'diego.rodriguez@onthefuze.com', role: 'Consultant' },
  { name: 'Pablo Aristizabal', email: 'pablo.aristizabal@onthefuze.com', role: 'Consultant' },
  { name: 'Melissa Florez', email: 'melissa.florez@onthefuze.com', role: 'Consultant' },
  { name: 'Valeria Marin', email: 'valeria.marin@onthefuze.com', role: 'Consultant' }


];

module.exports = TEAM_MEMBERS;