import { prisma } from '../../lib/prisma.js';

export class OccupancyService {
  constructor() {}

  private getLevel(percentage: number): 'EMPTY' | 'QUIET' | 'MODERATE' | 'BUSY' | 'FULL' {
    if (percentage <= 15) return 'EMPTY';
    if (percentage <= 35) return 'QUIET';
    if (percentage <= 60) return 'MODERATE';
    if (percentage <= 85) return 'BUSY';
    return 'FULL';
  }

  async getCurrentOccupancy() {
    const reading = await prisma.occupancyReading.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    if (!reading) {
      return {
        id: 'no-data',
        count: 0,
        capacity: 100,
        percentage: 0,
        level: 'EMPTY',
        timestamp: new Date().toISOString(),
      };
    }

    const percentage = Math.round((reading.count / reading.capacity) * 100);
    return {
      ...reading,
      percentage,
      level: this.getLevel(percentage),
    };
  }

  async getDayHistory(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const readings = await prisma.occupancyReading.findMany({
      where: {
        timestamp: {
          gte: targetDate,
          lte: endOfDay,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    const capacity = readings.length > 0 ? readings[0].capacity : 100;
    const formattedReadings = readings.map((r) => {
      const d = new Date(r.timestamp);
      return {
        hour: d.getHours(),
        minute: d.getMinutes(),
        count: r.count,
      };
    });

    return {
      date: targetDate.toISOString().split('T')[0],
      capacity,
      readings: formattedReadings,
    };
  }

  async getForecast() {
    // Para simplificar no SQLite/Postgres básico, faremos a previsão via Prisma em memória ou query crua
    // Em produção, isso seria uma view ou agrupamento mais sofisticado
    const now = new Date();
    const currentHour = now.getHours();
    
    // Obter as leituras das últimas 4 semanas do mesmo dia da semana
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const allReadings = await prisma.occupancyReading.findMany({
      where: {
        timestamp: { gte: fourWeeksAgo },
      },
    });
    
    const currentDayOfWeek = now.getDay();
    
    // Filtrar mesmo dia da semana e horas a partir de agora até fim do dia
    const relevantReadings = allReadings.filter((r) => {
      const t = new Date(r.timestamp);
      return t.getDay() === currentDayOfWeek && t.getHours() >= currentHour;
    });
    
    // Agrupar por hora
    const groupedByHour: Record<number, number[]> = {};
    for (let h = currentHour; h < 24; h++) {
      groupedByHour[h] = [];
    }
    
    relevantReadings.forEach((r) => {
      const h = new Date(r.timestamp).getHours();
      if (groupedByHour[h]) {
        groupedByHour[h].push(r.count);
      }
    });
    
    const capacity = allReadings.length > 0 ? allReadings[0].capacity : 100;
    const forecast = [];
    
    for (let h = currentHour; h < 24; h++) {
      const counts = groupedByHour[h];
      let avgCount = 0;
      if (counts.length > 0) {
        avgCount = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
      }
      
      const percentage = Math.round((avgCount / capacity) * 100);
      forecast.push({
        hour: h,
        avgCount,
        percentage,
        level: this.getLevel(percentage),
      });
    }

    // Se não tiver dados suficientes (novo app), gera valores simulados baseados na hora
    if (allReadings.length === 0) {
       for (let h = currentHour; h < 24; h++) {
         let mockCount = 0;
         if (h >= 18 && h <= 21) mockCount = Math.round(capacity * 0.8);
         else if (h >= 6 && h <= 9) mockCount = Math.round(capacity * 0.6);
         else if (h > 9 && h < 18) mockCount = Math.round(capacity * 0.3);
         
         const pct = Math.round((mockCount / capacity) * 100);
         const f = forecast.find(f => f.hour === h);
         if (f) {
           f.avgCount = mockCount;
           f.percentage = pct;
           f.level = this.getLevel(pct);
         }
       }
    }
    
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    
    return {
      dayOfWeek: dayNames[currentDayOfWeek],
      capacity,
      forecast,
    };
  }

  async createReading(count: number, capacity: number) {
    const reading = await prisma.occupancyReading.create({
      data: {
        count,
        capacity,
      },
    });

    const percentage = Math.round((reading.count / reading.capacity) * 100);
    return {
      ...reading,
      percentage,
      level: this.getLevel(percentage),
    };
  }
}
