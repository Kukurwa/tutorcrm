import type { Subject, SubjectChannel } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();

const subjects: Subject[] = [
  { id: 'subj_math', name: 'Математика', active: true, createdAt: now, updatedAt: now },
  { id: 'subj_english', name: 'Английский', active: true, createdAt: now, updatedAt: now },
  { id: 'subj_physics', name: 'Физика', active: true, createdAt: now, updatedAt: now },
  { id: 'subj_ukr', name: 'Украинский язык', active: true, createdAt: now, updatedAt: now },
  { id: 'subj_zno', name: 'Подготовка к ЗНО', active: true, createdAt: now, updatedAt: now },
];

const channels: SubjectChannel[] = [
  {
    id: 'ch_math_contract',
    subjectId: 'subj_math',
    dealType: 'contract',
    channelName: '@tutors_math_contracts',
    active: true,
  },
  {
    id: 'ch_math_one',
    subjectId: 'subj_math',
    dealType: 'one_time',
    channelName: '@tutors_math_quick',
    active: true,
  },
  {
    id: 'ch_eng_contract',
    subjectId: 'subj_english',
    dealType: 'contract',
    channelName: '@tutors_english_contracts',
    active: true,
  },
  {
    id: 'ch_phys_contract',
    subjectId: 'subj_physics',
    dealType: 'contract',
    channelName: '@tutors_physics_contracts',
    active: true,
  },
];

export const subjectsStore = new MockCollection<Subject>('subjects', subjects);
export const subjectChannelsStore = new MockCollection<SubjectChannel>(
  'subject_channels',
  channels,
);
