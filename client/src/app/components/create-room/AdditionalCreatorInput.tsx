import {
  Box,
  Button,
  Chip,
  config,
  Icon,
  Icons,
  Input,
  Line,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Text,
  toRem,
} from 'folds';
import { isKeyHotkey } from 'is-hotkey';
import FocusTrap from 'focus-trap-react';
import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  useMemo,
  useState,
} from 'react';
import { SettingTile } from '../setting-tile';
import { stopPropagation } from '../../utils/keyboard';
import { useAsyncSearch, UseAsyncSearchOptions } from '../../hooks/useAsyncSearch';
import { getCurrentUserId } from '../../utils/authCache';

const makeHighlightRegex = (queries: string[]) => new RegExp(`(${queries.join('|')})`, 'gi');
const highlightText = (regex: RegExp, texts: string[]) => {
  const text = texts.join('');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <span key={i} style={{ color: '#00f2ff' }}>{part}</span> : <React.Fragment key={i}>{part}</React.Fragment>
  );
};

// Helper: validate UUID format
const isValidUserId = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Helper: truncate user ID for display
const displayUserId = (userId: string): string => userId.length > 12 ? userId.slice(0, 12) + '...' : userId;

export const useAdditionalCreators = (defaultCreators?: string[]) => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  React.useEffect(() => {
    getCurrentUserId().then(id => setCurrentUser(id));
  }, []);

  const [additionalCreators, setAdditionalCreators] = useState<string[]>(
    () => defaultCreators ?? []
  );

  const addAdditionalCreator = (userId: string) => {
    if (userId === currentUser) return;

    setAdditionalCreators((creators) => {
      const creatorsSet = new Set(creators);
      creatorsSet.add(userId);
      return Array.from(creatorsSet);
    });
  };

  const removeAdditionalCreator = (userId: string) => {
    setAdditionalCreators((creators) => {
      const creatorsSet = new Set(creators);
      creatorsSet.delete(userId);
      return Array.from(creatorsSet);
    });
  };

  return {
    additionalCreators,
    addAdditionalCreator,
    removeAdditionalCreator,
  };
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 1000,
  matchOptions: {
    contain: true,
  },
};
const getUserIdString = (userId: string) => displayUserId(userId);

type AdditionalCreatorInputProps = {
  additionalCreators: string[];
  onSelect: (userId: string) => void;
  onRemove: (userId: string) => void;
  disabled?: boolean;
};
export function AdditionalCreatorInput({
  additionalCreators,
  onSelect,
  onRemove,
  disabled,
}: AdditionalCreatorInputProps) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  React.useEffect(() => {
    getCurrentUserId().then(id => setCurrentUser(id));
  }, []);

  const [menuCords, setMenuCords] = useState<RectCords>();
  const directUsers: string[] = []; // TODO: populate from Supabase contacts

  const [validUserId, setValidUserId] = useState<string>();
  const filteredUsers = useMemo(
    () => directUsers.filter((userId) => !additionalCreators.includes(userId)),
    [directUsers, additionalCreators]
  );
  const [result, search, resetSearch] = useAsyncSearch(
    filteredUsers,
    getUserIdString,
    SEARCH_OPTIONS
  );
  const queryHighlighRegex = result?.query ? makeHighlightRegex([result.query]) : undefined;

  const suggestionUsers = result
    ? result.items
    : filteredUsers.sort((a, b) => (a.toLocaleLowerCase() >= b.toLocaleLowerCase() ? 1 : -1));

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };
  const handleCloseMenu = () => {
    setMenuCords(undefined);
    setValidUserId(undefined);
    resetSearch();
  };

  const handleCreatorChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const creatorInput = evt.currentTarget;
    const creator = creatorInput.value.trim();
    if (isValidUserId(creator)) {
      setValidUserId(creator);
    } else {
      setValidUserId(undefined);
      const term = creator;
      if (term) {
        search(term);
      } else {
        resetSearch();
      }
    }
  };

  const handleSelectUserId = (userId?: string) => {
    if (userId && isValidUserId(userId)) {
      onSelect(userId);
      handleCloseMenu();
    }
  };

  const handleCreatorKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (isKeyHotkey('enter', evt)) {
      evt.preventDefault();
      const creator = evt.currentTarget.value.trim();
      handleSelectUserId(isValidUserId(creator) ? creator : suggestionUsers[0]);
    }
  };

  const handleEnterClick = () => {
    handleSelectUserId(validUserId);
  };

  return (
    <SettingTile
      title="Founders"
      description="Special privileged users can be assigned during creation. These users have elevated control and can only be modified during a upgrade."
    >
      <Box shrink="No" direction="Column" gap="100">
        <Box gap="200" wrap="Wrap">
          <Chip type="button" variant="Primary" radii="Pill" outlined>
            <Text size="B300">{currentUser ? displayUserId(currentUser) : '...'}</Text>
          </Chip>
          {additionalCreators.map((creator) => (
            <Chip
              type="button"
              key={creator}
              variant="Secondary"
              radii="Pill"
              after={<Icon size="50" src={Icons.Cross} />}
              onClick={() => onRemove(creator)}
              disabled={disabled}
            >
              <Text size="B300">{creator}</Text>
            </Chip>
          ))}
          <PopOut
            anchor={menuCords}
            position="Bottom"
            align="Center"
            content={
              <FocusTrap
                focusTrapOptions={{
                  onDeactivate: handleCloseMenu,
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                  isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Menu
                  style={{
                    width: '100vw',
                    maxWidth: toRem(300),
                    height: toRem(250),
                    display: 'flex',
                  }}
                >
                  <Box grow="Yes" direction="Column">
                    <Box shrink="No" gap="100" style={{ padding: config.space.S100 }}>
                      <Box grow="Yes" direction="Column" gap="100">
                        <Input
                          size="400"
                          variant="Background"
                          radii="300"
                          outlined
                          placeholder="@username:server"
                          onChange={handleCreatorChange}
                          onKeyDown={handleCreatorKeyDown}
                        />
                      </Box>
                      <Button
                        type="button"
                        variant="Success"
                        radii="300"
                        onClick={handleEnterClick}
                        disabled={!validUserId}
                      >
                        <Text size="B400">Enter</Text>
                      </Button>
                    </Box>
                    <Line size="300" />
                    <Box grow="Yes" direction="Column">
                      {!validUserId && suggestionUsers.length > 0 ? (
                        <Scroll size="300" hideTrack>
                          <Box
                            grow="Yes"
                            direction="Column"
                            gap="100"
                            style={{ padding: config.space.S200, paddingRight: 0 }}
                          >
                            {suggestionUsers.map((userId) => (
                              <MenuItem
                                key={userId}
                                size="300"
                                variant="Surface"
                                radii="300"
                                onClick={() => handleSelectUserId(userId)}
                              >
                                <Box grow="Yes">
                                  <Text size="T200" truncate>
                                    <b>
                                      {queryHighlighRegex
                                        ? highlightText(queryHighlighRegex, [
                                          displayUserId(userId),
                                        ])
                                        : displayUserId(userId)}
                                    </b>
                                  </Text>
                                </Box>
                              </MenuItem>
                            ))}
                          </Box>
                        </Scroll>
                      ) : (
                        <Box
                          grow="Yes"
                          alignItems="Center"
                          justifyContent="Center"
                          direction="Column"
                          gap="100"
                        >
                          <Text size="H6" align="Center">
                            No Suggestions
                          </Text>
                          <Text size="T200" align="Center">
                            Please provide the user ID and hit Enter.
                          </Text>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Menu>
              </FocusTrap>
            }
          >
            <Chip
              type="button"
              variant="Secondary"
              radii="Pill"
              onClick={handleOpenMenu}
              aria-pressed={!!menuCords}
              disabled={disabled}
            >
              <Icon size="50" src={Icons.Plus} />
            </Chip>
          </PopOut>
        </Box>
      </Box>
    </SettingTile>
  );
}
