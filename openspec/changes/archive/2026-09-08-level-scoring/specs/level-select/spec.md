## MODIFIED Requirements

### Requirement: Level select shows best result on completed tiles

Completed level tiles SHALL show the player's best star rating for that level as 1–3 star icons. Tiles for levels that have not been completed SHALL not show any star rating.

#### Scenario: Stars shown on a completed tile

- **WHEN** a player's best result on level 5 is 3 stars
- **THEN** the tile for level 5 shows 3 star icons

#### Scenario: One star shown for hint-capped completion

- **WHEN** a player's best result on level 8 is 1 star
- **THEN** the tile for level 8 shows 1 star icon

#### Scenario: No stars on uncompleted tile

- **WHEN** level 12 has not been completed
- **THEN** the tile for level 12 shows no star icons
