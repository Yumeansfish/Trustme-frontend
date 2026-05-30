export interface QuestionnaireOption {
  id: string;
  label: string;
  order: number;
}

export interface QuestionnaireQuestion {
  id: string;
  type: 'single_choice';
  text: string;
  required: boolean;
  order: number;
  options: QuestionnaireOption[];
}

export interface QuestionnaireTemplate {
  survey_template_id: string;
  title: string;
  description: string;
  global_questions: QuestionnaireQuestion[];
  video_questions: QuestionnaireQuestion[];
}

export interface QuestionnaireVideo {
  video_id: string;
  filename: string;
  video_url: string;
  recorded_at: string;
}

export interface QuestionnaireInstance {
  survey_id: string;
  survey_template_id: string;
  logical_date?: string;
  status: 'pending' | 'completed';
  videos: QuestionnaireVideo[];
}

export interface QuestionnaireBundleResponse {
  survey_template: QuestionnaireTemplate;
  survey_instances: QuestionnaireInstance[];
}

export interface QuestionnaireAnswerSubmission {
  question_id: string;
  option_id: string;
}

export interface QuestionnaireVideoAnswerSubmission {
  video_id: string;
  answers: QuestionnaireAnswerSubmission[];
}

export interface QuestionnaireGlobalAnswerSubmission {
  question_id: string;
  option_id: string;
}

export interface QuestionnaireSubmissionResponse {
  survey_id: string;
  survey_template_id: string;
  status: 'pending' | 'completed';
  submitted_at: string;
}
