# Users Management Module

## Overview
The Users Management module provides comprehensive user administration functionality for the application. It allows administrators to create, view, update, and delete user accounts, manage user roles, and control granular permissions through a drag-and-drop interface.

## Structure
```
app/home/users/
├── page.tsx                    # Main page with server-side data fetching
└── ui/
    ├── userList.tsx            # Main user list component with search
    ├── userCard.tsx            # Individual user card component
    ├── CreateUserDialog.tsx    # User creation dialog
    ├── UpdateUserDialog.tsx    # User update dialog
    ├── DeleteUserDialog.tsx    # User deletion confirmation
    ├── ManageUserPermissionsDialog.tsx # Permissions management
    ├── UpdateUserPasswordDialog.tsx    # Password update dialog
    ├── ViewUserPermissionsDialog.tsx   # Permissions viewing
    └── UserProfileDropdown.tsx          # User profile dropdown
```

## Key Components

### UserList
- **Purpose**: Main container component displaying the user grid with search functionality
- **Features**:
  - Server-side search with URL parameter synchronization
  - Responsive grid layout (1-3 columns based on screen size)
  - Add user button with dialog trigger
  - Empty state handling
  - Real-time search with router refresh

### UserCard
- **Purpose**: Individual user display card with actions
- **Features**:
  - Avatar placeholder with user icon
  - User information display (name, username, email, phone)
  - Role-based badges (Admin/Operator)
  - Permission-based action buttons (edit, delete, manage permissions)
  - Admin user protection (cannot edit/delete admin user)
  - Responsive layout with proper spacing

### CreateUserDialog
- **Purpose**: Modal dialog for creating new users
- **Features**:
  - Form validation with required fields
  - User information (username, email, password, phone, role)
  - Optional person information (name, DNI)
  - Role selection (Admin/Operator)
  - Success/error handling with alerts
  - Form reset after successful creation

### ManageUserPermissionsDialog
- **Purpose**: Advanced permissions management with drag-and-drop interface
- **Features**:
  - Dual-column layout (Available/Assigned permissions)
  - Drag-and-drop functionality for permission assignment
  - Real-time permission loading from server
  - Session update after permission changes
  - Visual feedback for drag operations
  - Permission count indicators

## Functionalities

### User CRUD Operations
- **Create**: Add new users with role assignment and optional person details
- **Read**: Display user list with search and filtering
- **Update**: Modify user information (excluding admin user)
- **Delete**: Remove users with confirmation (excluding admin user)

### Permission Management
- **Granular Permissions**: Control access to specific features via ability-based permissions
- **Drag-and-Drop Assignment**: Intuitive interface for permission management
- **Real-time Updates**: Immediate session updates for permission changes
- **Permission Definitions**: Centralized permission definitions with descriptions

### Search and Navigation
- **Global Search**: Search across user fields with URL synchronization
- **Responsive Design**: Adaptive layout for different screen sizes
- **URL State Management**: Search parameters maintained in browser URL

## User Roles

### Administrator (ADMIN)
- Full system access
- Can manage all users and permissions
- Cannot be edited or deleted through the UI
- Protected account for system administration

### Operator (OPERATOR)
- Limited access based on assigned permissions
- Can perform operational tasks within granted permissions
- Can be managed by administrators

## Permission System

### Permission Categories
- **Users Management**: USERS_CREATE, USERS_READ, USERS_UPDATE, USERS_DELETE
- **Producers Management**: PRODUCERS_CREATE, PRODUCERS_READ, etc.
- **Products Management**: VARIETIES_CREATE, TRAYS_CREATE, etc.
- **Receptions Management**: RECEPTIONS_CREATE, RECEPTIONS_READ, etc.
- **Storage Management**: STORAGE_READ, STORAGE_UPDATE, etc.
- **Audit Access**: AUDIT_READ
- **Settlements**: SETTLEMENTS_READ, SETTLEMENTS_UPDATE, etc.

### Permission Assignment
- **Drag-and-Drop Interface**: Move permissions between available and assigned columns
- **Visual Feedback**: Clear indication of permission states
- **Bulk Operations**: Reset all permissions functionality
- **Session Synchronization**: Immediate permission updates in user session

## Data Flow

1. **Server-Side Rendering**: Page fetches users with optional search parameter
2. **Client-Side Search**: URL parameter updates trigger server refresh
3. **CRUD Operations**: Dialogs handle create/update/delete with server actions
4. **Permission Management**: Drag-and-drop updates permissions via server actions
5. **State Synchronization**: Router refresh updates UI after operations

## Dependencies

### Server Actions
- `getUsers(search)` - Fetch users with optional search filter
- `createUserWithPerson(data, currentUserId)` - Create user with person details
- `updateUserWithPerson(data, currentUserId)` - Update user information
- `deleteUser(userId)` - Delete user account
- `getUserPermissions(userId)` - Fetch user permissions
- `updateUserPermissions(data)` - Update user permissions

### Base Components
- `Dialog` - Modal dialogs for CRUD operations
- `CreateBaseForm/UpdateBaseForm` - Standardized form components
- `TextField` - Input components with icons
- `IconButton` - Action buttons
- `Badge` - Role and status indicators
- `Button` - Primary and secondary actions

### Utilities
- `usePermissions` - Permission checking hook
- `useAlert` - Toast notification system
- `PERMISSION_DEFINITIONS` - Centralized permission definitions
- NextAuth session management

## UI/UX Features

### Responsive Design
- **Mobile-First**: Single column on small screens
- **Progressive Enhancement**: 2-3 columns on larger screens
- **Touch-Friendly**: Appropriate button sizes and spacing

### Accessibility
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Proper focus handling in dialogs
- **Semantic HTML**: Proper use of article, header, section elements

### User Experience
- **Loading States**: Progress indicators during async operations
- **Error Handling**: Clear error messages and validation feedback
- **Success Feedback**: Toast notifications for successful operations
- **Confirmation Dialogs**: Safe deletion with user confirmation

### Visual Design
- **Card-Based Layout**: Clean card design for user information
- **Consistent Spacing**: Proper margins and padding throughout
- **Icon Usage**: Material symbols for visual clarity
- **Color Coding**: Role-based color schemes for badges

## Security Considerations

### Access Control
- **Permission-Based UI**: Buttons and features hidden based on permissions
- **Admin Protection**: Admin user cannot be modified or deleted
- **Session Validation**: Server-side validation of user permissions

### Data Validation
- **Required Fields**: Username, email, password for user creation
- **Email Validation**: Proper email format checking
- **Role Validation**: Restricted role options
- **DNI Validation**: Chilean ID number format

### Authentication Integration
- **NextAuth Integration**: Session management and user context
- **Permission Caching**: Permissions stored in user session
- **Real-time Updates**: Session updates after permission changes

## Maintenance Notes

### Permission Definitions
- Centralized in `@/lib/permissions.ts`
- Easy to add new permissions without code changes
- Descriptive labels and help text for administrators

### Form Management
- Standardized form components reduce duplication
- Consistent validation patterns across dialogs
- Error handling centralized in form components

### State Management
- URL-based state for search parameters
- Server state for user data with router.refresh()
- Local state for dialog management

### Performance Considerations
- Server-side search reduces client-side filtering
- Lazy loading of dialogs and permissions
- Efficient re-rendering with proper memoization

## Future Enhancements

- Bulk user operations (import/export)
- Advanced user filtering and sorting
- User activity logging and audit trails
- Password reset functionality
- Two-factor authentication
- User profile customization
- Role-based default permissions
- Permission groups/templates
- User invitation system</content>
<parameter name="filePath">/Users/felipe/dev/ElectNextStart/app/home/users/README.md