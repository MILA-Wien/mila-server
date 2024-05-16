const schema = initSchema("mila", "0.0.1");

export default schema;

schema.collections = [];

schema.fields = [
  {
    collection: "directus_users",
    field: "mila_survey_group",
    type: "alias",
    meta: {
      order: 200,
      interface: "group-detail",
      special: ["alias", "no-data", "group"],
      options: { title: "$t:person", headerIcon: "credit_card" },
      translations: [
        { language: "de-DE", translation: "Umfrage" },
        { language: "en-US", translation: "Survey" },
      ],
    },
  },
  {
    collection: "directus_users",
    field: "mila_groups_interested",
    type: "json",
    meta: {
      group: "mila_survey_group",
      interface: "select-multiple-checkbox",
      display: "labels",
      width: "half",
      special: ["cast-json"],
      options: {
        choices: [
          { text: "Sortiment", value: "Sortiment" },
          { text: "Öffentlichkeitsarbeit", value: "Öffentlichkeitsarbeit" },
          { text: "Minimarkt", value: "Minimarkt" },
          { text: "Finanzen", value: "Finanzen" },
          { text: "Genossenschaft", value: "Genossenschaft" },
          { text: "Standort", value: "Standort" },
          { text: "IT und Digitales", value: "IT und Digitales" },
          { text: "Diversität", value: "Diversität" },
          { text: "Events/Infogespräche", value: "Events/Infogespräche" },
          { text: "Personalkomitee", value: "Personalkomitee" },
        ],
      },
      translations: [
        { language: "de-DE", translation: "AG Interesse" },
        { language: "en-US", translation: "AG Interesse" },
      ],
    },
  },
  {
    collection: "directus_users",
    field: "mila_skills",
    type: "json",
    meta: {
      group: "mila_survey_group",
      interface: "select-multiple-checkbox",
      display: "labels",
      width: "half",
      special: ["cast-json"],
      options: {
        choices: [
          { text: "Handwerk", value: "handwerk" },
          { text: "Einzelhandel", value: "handel" },
          { text: "Genossenschaft", value: "geno" },
          { text: "Finanzen", value: "finanzen" },
          { text: "Kommunikation", value: "kommunikation" },
          { text: "Digitales", value: "digit" },
          { text: "Immobilien/Architektur/Planung", value: "immo" },
          { text: "Diversität", value: "diversitaet" },
          { text: "Personalführung", value: "personal" },
        ],
      },
      translations: [
        { language: "de-DE", translation: "Fähigkeiten" },
        { language: "en-US", translation: "Skills" },
      ],
    },
  },
  {
    collection: "directus_users",
    field: "mila_survey_contact",
    type: "text",
    meta: {
      group: "mila_survey_group",
      interface: "input-multiline",
      width: "half",
      translations: [
        { language: "de-DE", translation: "Umfrage Kontakt" },
        { language: "en-US", translation: "Survey Contact" },
      ],
    },
  },
  {
    collection: "directus_users",
    field: "mila_survey_motivation",
    type: "text",
    meta: {
      group: "mila_survey_group",
      interface: "input-multiline",
      width: "half",
      translations: [
        { language: "de-DE", translation: "Umfrage Motivation" },
        { language: "en-US", translation: "Survey Motivation" },
      ],
    },
  },
  {
    collection: "directus_users",
    field: "mila_pr_approved",
    type: "boolean",
    schema: { default_value: false, is_nullable: false },
    meta: { interface: "boolean", special: ["cast-boolean"], required: true },
  },
];

schema.relations = [];

const editor_fields: string[] = [
  "mila_survey_group",
  "mila_survey_contact",
  "mila_survey_motivation",
  "mila_groups_interested",
  "mila_skills",
];

const user_fields: string[] = [];

schema.permissions = [
  {
    collection: "directus_users",
    roleName: "collectivo_editor",
    action: "read",
    fields: user_fields,
  },
  {
    collection: "directus_users",
    roleName: "collectivo_editor",
    action: "update",

    fields: editor_fields,
  },
];
