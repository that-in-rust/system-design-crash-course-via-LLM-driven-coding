# Architecture Comparison: The Three Houses
### Understanding How Different Stacks Solve Identical Problems

---

## Table of Contents

1. [State Management](#state-management)
2. [Dependency Injection](#dependency-injection)
3. [Real-Time Communication](#real-time-communication)
4. [Form Handling](#form-handling)
5. [Authentication Flow](#authentication-flow)
6. [Error Handling](#error-handling)
7. [Testing Approaches](#testing-approaches)
8. [Performance Optimization](#performance-optimization)

---

## State Management

### Problem: How do we manage application state in a predictable way?

#### 🦁 Gryffindor (Zustand)

**Philosophy:** Minimal boilerplate, hooks-based

```typescript
// stores/incidentStore.ts
import create from 'zustand';

interface IncidentState {
  incidents: Incident[];
  loading: boolean;
  addIncident: (incident: Incident) => void;
  updateIncident: (id: number, updates: Partial<Incident>) => void;
}

export const useIncidentStore = create<IncidentState>((set) => ({
  incidents: [],
  loading: false,
  addIncident: (incident) =>
    set((state) => ({
      incidents: [incident, ...state.incidents]
    })),
  updateIncident: (id, updates) =>
    set((state) => ({
      incidents: state.incidents.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      )
    }))
}));

// Usage in component
function IncidentList() {
  const { incidents, addIncident } = useIncidentStore();
  // ...
}
```

**Pros:**
- Zero boilerplate
- TypeScript-first
- No providers needed
- Easy to debug

**Cons:**
- Less structure for large apps
- No built-in DevTools (but middleware available)

---

#### 🐍 Slytherin (NgRx)

**Philosophy:** Redux pattern with RxJS, strict unidirectional data flow

```typescript
// state/incident.actions.ts
export const incidentActions = createActionGroup({
  source: 'Incident',
  events: {
    'Load Incidents': emptyProps(),
    'Load Incidents Success': props<{ incidents: Incident[] }>(),
    'Add Incident': props<{ incident: Incident }>(),
    'Update Incident': props<{ id: number; updates: Partial<Incident> }>()
  }
});

// state/incident.reducer.ts
export interface IncidentState {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
}

const initialState: IncidentState = {
  incidents: [],
  loading: false,
  error: null
};

export const incidentReducer = createReducer(
  initialState,
  on(incidentActions.loadIncidents, (state) => ({
    ...state,
    loading: true
  })),
  on(incidentActions.loadIncidentsSuccess, (state, { incidents }) => ({
    ...state,
    incidents,
    loading: false
  })),
  on(incidentActions.addIncident, (state, { incident }) => ({
    ...state,
    incidents: [incident, ...state.incidents]
  }))
);

// state/incident.selectors.ts
export const selectIncidentState = createFeatureSelector<IncidentState>('incidents');

export const selectAllIncidents = createSelector(
  selectIncidentState,
  (state) => state.incidents
);

export const selectIncidentsLoading = createSelector(
  selectIncidentState,
  (state) => state.loading
);

// Usage in component
@Component({...})
export class IncidentListComponent {
  incidents$ = this.store.select(selectAllIncidents);
  loading$ = this.store.select(selectIncidentsLoading);

  constructor(private store: Store) {}

  addIncident(incident: Incident) {
    this.store.dispatch(incidentActions.addIncident({ incident }));
  }
}
```

**Pros:**
- Strong architectural guidance
- Time-travel debugging
- RxJS integration
- Testable (pure functions)

**Cons:**
- Significant boilerplate
- Steep learning curve
- Overkill for small apps

---

#### 🦅 Ravenclaw (Server-Driven)

**Philosophy:** State lives on server, minimal client-side state

```java
// Controller handles state implicitly
@Controller
@RequestMapping("/incidents")
public class IncidentController {

    @Autowired
    private IncidentService incidentService;

    @GetMapping
    public String listIncidents(Model model, Pageable pageable) {
        // State fetched from database on each request
        Page<Incident> incidents = incidentService.findAll(pageable);
        model.addAttribute("incidents", incidents);
        return "incidents/list"; // Thymeleaf template
    }

    @PostMapping
    public String createIncident(
        @Valid @ModelAttribute CreateIncidentDto dto,
        BindingResult result,
        RedirectAttributes redirectAttributes
    ) {
        if (result.hasErrors()) {
            return "incidents/form";
        }
        incidentService.create(dto);
        redirectAttributes.addFlashAttribute("success", "Incident created!");
        return "redirect:/incidents"; // POST-Redirect-GET pattern
    }
}

// Minimal client-side state with HTMX
<!-- incidents/list.html -->
<div hx-get="/incidents" hx-trigger="every 5s">
    <!-- Auto-refreshes every 5 seconds -->
    <div th:each="incident : ${incidents}">
        <h3 th:text="${incident.title}"></h3>
    </div>
</div>
```

**Pros:**
- Simple mental model
- Server is source of truth
- No state synchronization bugs

**Cons:**
- Less responsive UX
- More server round-trips
- Limited offline capability

---

## Dependency Injection

### Problem: How do we manage dependencies and enable testability?

#### 🦁 Gryffindor (Manual DI / Constructor Injection)

```typescript
// services/IncidentService.ts
export class IncidentService {
  constructor(
    private apiClient: ApiClient,
    private wsClient: WebSocketClient
  ) {}

  async createIncident(dto: CreateIncidentDto): Promise<Incident> {
    const incident = await this.apiClient.post('/incidents', dto);
    this.wsClient.emit('incident:created', incident);
    return incident;
  }
}

// Composition root
const apiClient = new ApiClient(process.env.API_URL);
const wsClient = new WebSocketClient(process.env.WS_URL);
const incidentService = new IncidentService(apiClient, wsClient);

// Testing
const mockApiClient = createMock<ApiClient>();
const mockWsClient = createMock<WebSocketClient>();
const service = new IncidentService(mockApiClient, mockWsClient);
```

**Pros:**
- Explicit dependencies
- Easy to test
- No magic

**Cons:**
- Manual wiring
- No lifecycle management

---

#### 🐍 Slytherin (Angular DI)

```typescript
// services/incident.service.ts
@Injectable({ providedIn: 'root' })
export class IncidentService {
  constructor(
    private http: HttpClient,
    private signalR: SignalRService
  ) {}

  createIncident(dto: CreateIncidentDto): Observable<Incident> {
    return this.http.post<Incident>('/api/incidents', dto).pipe(
      tap((incident) => this.signalR.broadcast('incident:created', incident))
    );
  }
}

// Testing with Angular TestBed
TestBed.configureTestingModule({
  providers: [
    IncidentService,
    { provide: HttpClient, useValue: mockHttpClient },
    { provide: SignalRService, useValue: mockSignalR }
  ]
});
const service = TestBed.inject(IncidentService);
```

**Pros:**
- Framework-managed
- Hierarchical injectors
- Built-in testing utilities

**Cons:**
- Angular-specific
- Magic at times
- Verbose test setup

---

#### 🦅 Ravenclaw (Spring DI)

```java
@Service
public class IncidentService {

    private final IncidentRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    // Constructor injection (recommended)
    @Autowired
    public IncidentService(
        IncidentRepository repository,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
    }

    public Incident createIncident(CreateIncidentDto dto) {
        Incident incident = repository.save(dto.toEntity());
        messagingTemplate.convertAndSend("/topic/incidents", incident);
        return incident;
    }
}

// Testing with Spring Boot Test
@SpringBootTest
class IncidentServiceTest {

    @MockBean
    private IncidentRepository repository;

    @MockBean
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private IncidentService service;

    @Test
    void testCreateIncident() {
        // ...
    }
}
```

**Pros:**
- Convention-driven
- Powerful (proxies, AOP)
- Mature ecosystem

**Cons:**
- Annotation overload
- Startup time
- Complex failure modes

---

## Real-Time Communication

### Problem: How do we push updates from server to client?

#### 🦁 Gryffindor (Socket.io)

**Server:**
```typescript
import { Server } from 'socket.io';

const io = new Server(httpServer);

io.on('connection', (socket) => {
  socket.on('join:incident', (incidentId) => {
    socket.join(`incident:${incidentId}`);
  });
});

// Broadcast to all clients
io.emit('incident:created', incident);

// Broadcast to room
io.to(`incident:${id}`).emit('incident:updated', incident);
```

**Client:**
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4001');

socket.on('incident:created', (incident) => {
  incidentStore.getState().addIncident(incident);
});

socket.emit('join:incident', 42);
```

**Pros:**
- Simple API
- Auto-reconnection
- Fallback to polling

**Cons:**
- Not type-safe
- Scaling requires Redis

---

#### 🐍 Slytherin (SignalR)

**Server:**
```csharp
[Authorize]
public class IncidentHub : Hub
{
    public async Task JoinIncidentRoom(long incidentId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"incident:{incidentId}");
    }
}

// Broadcasting from service
public class IncidentService
{
    private readonly IHubContext<IncidentHub> _hubContext;

    public async Task CreateIncident(CreateIncidentDto dto)
    {
        var incident = await _repository.SaveAsync(dto);
        await _hubContext.Clients.All.SendAsync("IncidentCreated", incident);
    }
}
```

**Client:**
```typescript
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
  .withUrl('/hub/incidents', { accessTokenFactory: () => token })
  .withAutomaticReconnect()
  .build();

connection.on('IncidentCreated', (incident) => {
  this.store.dispatch(incidentActions.addIncident({ incident }));
});

await connection.start();
await connection.invoke('JoinIncidentRoom', 42);
```

**Pros:**
- Type-safe (with TypeScript client)
- .NET integration
- Strong authentication

**Cons:**
- .NET-specific
- Less flexible than Socket.io

---

#### 🦅 Ravenclaw (STOMP over WebSocket)

**Server:**
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
}

@Controller
public class IncidentWebSocketController {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void broadcastIncidentCreated(Incident incident) {
        messagingTemplate.convertAndSend("/topic/incidents", incident);
    }
}
```

**Client:**
```javascript
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const socket = new SockJS('/ws');
const stompClient = Stomp.over(socket);

stompClient.connect({}, () => {
  stompClient.subscribe('/topic/incidents', (message) => {
    const incident = JSON.parse(message.body);
    // Handle incident
  });
});
```

**Pros:**
- Standard protocol (STOMP)
- Spring integration
- Message broker support

**Cons:**
- More complex setup
- Heavier than alternatives

---

## Form Handling

### Problem: How do we validate user input and display errors?

#### 🦁 Gryffindor (React Hook Form)

```typescript
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  severity: z.enum(['MISCHIEF', 'SUSPICIOUS', 'DANGEROUS', 'UNFORGIVABLE']),
  location: z.enum(['HOGWARTS', 'HOGSMEADE', /* ... */]),
  description: z.string().optional()
});

type FormData = z.infer<typeof schema>;

function IncidentForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    await incidentService.create(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}

      <select {...register('severity')}>
        <option value="MISCHIEF">Mischief</option>
        {/* ... */}
      </select>

      <button type="submit">Submit</button>
    </form>
  );
}
```

---

#### 🐍 Slytherin (Reactive Forms)

```typescript
import { FormBuilder, Validators } from '@angular/forms';

@Component({...})
export class IncidentFormComponent {
  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    severity: ['MISCHIEF', Validators.required],
    location: ['HOGWARTS', Validators.required],
    description: ['']
  });

  constructor(
    private fb: FormBuilder,
    private incidentService: IncidentService
  ) {}

  onSubmit() {
    if (this.form.valid) {
      this.incidentService.create(this.form.value)
        .subscribe(incident => {
          // Handle success
        });
    }
  }
}

<!-- Template -->
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <input formControlName="title" />
  <div *ngIf="form.get('title')?.invalid && form.get('title')?.touched">
    <span *ngIf="form.get('title')?.hasError('required')">
      Title is required
    </span>
  </div>

  <select formControlName="severity">
    <option value="MISCHIEF">Mischief</option>
  </select>

  <button [disabled]="form.invalid">Submit</button>
</form>
```

---

#### 🦅 Ravenclaw (Spring MVC + Bean Validation)

```java
public class CreateIncidentDto {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must be less than 255 characters")
    private String title;

    @NotNull(message = "Severity is required")
    private SeverityLevel severity;

    @NotNull(message = "Location is required")
    private LocationType location;

    private String description;
}

@Controller
public class IncidentController {

    @PostMapping("/incidents")
    public String createIncident(
        @Valid @ModelAttribute CreateIncidentDto dto,
        BindingResult result,
        Model model
    ) {
        if (result.hasErrors()) {
            model.addAttribute("errors", result.getAllErrors());
            return "incidents/form";
        }

        incidentService.create(dto);
        return "redirect:/incidents";
    }
}

<!-- Thymeleaf template -->
<form th:action="@{/incidents}" method="post" th:object="${dto}">
  <input type="text" th:field="*{title}" />
  <span th:if="${#fields.hasErrors('title')}" th:errors="*{title}"></span>

  <select th:field="*{severity}">
    <option value="MISCHIEF">Mischief</option>
  </select>

  <button type="submit">Submit</button>
</form>
```

---

## Summary Table

| Feature | Gryffindor | Slytherin | Ravenclaw |
|---------|-----------|-----------|-----------|
| **Learning Curve** | Moderate | Steep | Gentle |
| **Boilerplate** | Low | High | Medium |
| **Type Safety** | TypeScript | TypeScript | Java |
| **Real-Time** | Socket.io | SignalR | STOMP |
| **State Mgmt** | Zustand | NgRx | Server-driven |
| **DI** | Manual | Angular DI | Spring DI |
| **Best For** | Startups | Enterprise | Legacy |

---

**Key Takeaway:** There is no "best" stack—only trade-offs that align with your project's needs.

- **Gryffindor** prioritizes speed and flexibility
- **Slytherin** prioritizes structure and safety
- **Ravenclaw** prioritizes convention and maturity

Choose wisely, or better yet, learn all three!

---

*"It does not do to dwell on dreams and forget to live."* — Albus Dumbledore
