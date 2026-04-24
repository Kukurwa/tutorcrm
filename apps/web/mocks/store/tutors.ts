import type { Tutor } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();

const tutors: Tutor[] = [
  {
    id: 'tut_1',
    name: 'Анна Мельник',
    phone: '+380501112233',
    experienceYears: 8,
    subjects: ['subj_math', 'subj_physics'],
    hourlyRate: 600,
    note: 'ЗНО 199. Опытный преподаватель.',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tut_2',
    name: 'Игорь Петренко',
    phone: '+380672223344',
    experienceYears: 5,
    subjects: ['subj_english'],
    hourlyRate: 450,
    note: 'C1, опыт с подростками.',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tut_3',
    name: 'Оксана Іваненко',
    phone: '+380939998877',
    experienceYears: 3,
    subjects: ['subj_ukr', 'subj_zno'],
    hourlyRate: 400,
    note: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tut_4',
    name: 'Сергій Бондаренко',
    phone: null,
    experienceYears: 12,
    subjects: ['subj_math'],
    hourlyRate: 800,
    note: 'Работает только по контрактам.',
    status: 'paused',
    createdAt: now,
    updatedAt: now,
  },
];

export const tutorsStore = new MockCollection<Tutor>('tutors', tutors);
