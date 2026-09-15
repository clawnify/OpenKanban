-- Fictional project board, loaded only in the disposable demo workspace.
INSERT INTO lists (id, title, position) VALUES
  (1, 'To do', 0), (2, 'In progress', 1), (3, 'Done', 2);
INSERT INTO cards (id, list_id, title, description, position) VALUES
  (1, 1, 'Gather customer feedback', 'Collect three ideas for the next release.', 0),
  (2, 1, 'Plan the launch checklist', 'List the tasks needed before launch day.', 1),
  (3, 2, 'Design the welcome page', 'Review the first draft with the team.', 0),
  (4, 2, 'Write the getting started guide', 'Keep the first steps short and practical.', 1),
  (5, 3, 'Agree on project goals', 'The team has chosen the first milestone.', 0);
