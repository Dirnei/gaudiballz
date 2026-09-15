## ADDED Requirements

### Requirement: Hover feedback on active drop target

While a drag is active and the pointer is positioned over a tube that is a valid drop target, that tube SHALL display an intensified visual highlight distinct from the static drop-target highlight. The intensified highlight SHALL make it clear that releasing the pointer at the current position will execute the pour. When the pointer moves away from the tube, the intensified highlight SHALL immediately revert to the standard drop-target highlight. At most one tube SHALL show the intensified highlight at any time.

#### Scenario: Pointer over a valid target shows hover highlight

- **WHEN** a drag is active from tube 0 with red balls
- **AND** tubes 2 and 4 are valid drop targets (both showing the standard drop-target highlight)
- **AND** the pointer moves over tube 2
- **THEN** tube 2 displays the intensified hover highlight
- **AND** tube 4 continues to display the standard drop-target highlight

#### Scenario: Pointer leaves a valid target reverts to standard highlight

- **WHEN** a drag is active and tube 2 is showing the intensified hover highlight
- **AND** the pointer moves away from tube 2 to empty space
- **THEN** tube 2 reverts to the standard drop-target highlight

#### Scenario: Pointer moves between valid targets

- **WHEN** a drag is active and tube 2 is showing the intensified hover highlight
- **AND** the pointer moves from tube 2 directly to tube 4 (also a valid target)
- **THEN** tube 4 displays the intensified hover highlight
- **AND** tube 2 reverts to the standard drop-target highlight

#### Scenario: Pointer over an invalid target shows no hover highlight

- **WHEN** a drag is active from tube 0
- **AND** the pointer moves over tube 3, which is not a valid drop target
- **THEN** tube 3 does NOT display the intensified hover highlight

#### Scenario: Pointer over the source tube shows no hover highlight

- **WHEN** a drag is active from tube 0
- **AND** the pointer moves over tube 0
- **THEN** tube 0 does NOT display the intensified hover highlight

#### Scenario: Hover highlight is absent when no drag is active

- **WHEN** no drag gesture is active
- **THEN** no tube displays the intensified hover highlight, regardless of pointer position
