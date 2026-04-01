package com.portfolio.commerce;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

record CreateOrderRequest(
        @NotBlank String customer,
        @NotBlank String channel,
        @Min(1) double value,
        @NotBlank String sku,
        @Min(1) int quantity,
        @Min(1) int deadlineDays
) {}

record TransitionOrderRequest(
        @NotNull OrderStatus targetStatus,
        String reason
) {}

record ReserveStockRequest(
        @NotBlank String warehouse
) {}

record OrderResponse(
        String id,
        String customer,
        String channel,
        double value,
        String sku,
        int quantity,
        int deadlineDays,
        OrderStatus status,
        boolean stockReserved,
        Instant createdAt
) {}

record AuditEventResponse(
        String id,
        String orderId,
        String message,
        Instant createdAt
) {}

enum OrderStatus {
    NEW,
    PICKING,
    PACKING,
    SHIPPING,
    DELIVERED,
    CANCELED
}

class OrderAggregate {
    String id;
    String customer;
    String channel;
    double value;
    String sku;
    int quantity;
    int deadlineDays;
    OrderStatus status;
    boolean stockReserved;
    Instant createdAt;
}

class AuditEvent {
    String id;
    String orderId;
    String message;
    Instant createdAt;
}

@RestController
@RequestMapping("/api/orders")
@Validated
public class OrderController {

    private final Map<String, OrderAggregate> orders = new ConcurrentHashMap<>();
    private final Map<String, List<AuditEvent>> auditByOrder = new ConcurrentHashMap<>();
    private final Map<OrderStatus, OrderStatus> nextStatus = new EnumMap<>(OrderStatus.class);

    public OrderController() {
        nextStatus.put(OrderStatus.NEW, OrderStatus.PICKING);
        nextStatus.put(OrderStatus.PICKING, OrderStatus.PACKING);
        nextStatus.put(OrderStatus.PACKING, OrderStatus.SHIPPING);
        nextStatus.put(OrderStatus.SHIPPING, OrderStatus.DELIVERED);
    }

    @GetMapping("/health")
    public String health() {
        return "ok";
    }

    @GetMapping
    public List<OrderResponse> list() {
        return orders.values().stream().map(this::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) {
        OrderAggregate order = new OrderAggregate();
        order.id = UUID.randomUUID().toString();
        order.customer = request.customer();
        order.channel = request.channel();
        order.value = request.value();
        order.sku = request.sku();
        order.quantity = request.quantity();
        order.deadlineDays = request.deadlineDays();
        order.status = OrderStatus.NEW;
        order.stockReserved = false;
        order.createdAt = Instant.now();

        orders.put(order.id, order);
        addAudit(order.id, "Pedido criado no status NEW.");
        return toResponse(order);
    }

    @PatchMapping("/{id}/reserve-stock")
    public ResponseEntity<OrderResponse> reserveStock(
            @PathVariable String id,
            @Valid @RequestBody ReserveStockRequest request
    ) {
        OrderAggregate order = orders.get(id);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        if (order.status == OrderStatus.DELIVERED || order.status == OrderStatus.CANCELED) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        order.stockReserved = true;
        addAudit(order.id, "Estoque reservado em " + request.warehouse() + ".");
        return ResponseEntity.ok(toResponse(order));
    }

    @PatchMapping("/{id}/transition")
    public ResponseEntity<OrderResponse> transition(
            @PathVariable String id,
            @Valid @RequestBody TransitionOrderRequest request
    ) {
        OrderAggregate order = orders.get(id);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        OrderStatus target = request.targetStatus();
        if (target == OrderStatus.CANCELED) {
            if (order.status == OrderStatus.DELIVERED) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            order.status = OrderStatus.CANCELED;
            addAudit(order.id, "Pedido cancelado. " + safeReason(request.reason()));
            return ResponseEntity.ok(toResponse(order));
        }

        OrderStatus expected = nextStatus.get(order.status);
        if (expected == null || expected != target) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        if (order.status == OrderStatus.NEW && !order.stockReserved) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        OrderStatus from = order.status;
        order.status = target;
        addAudit(order.id, "Transição " + from + " -> " + target + ". " + safeReason(request.reason()));
        return ResponseEntity.ok(toResponse(order));
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<List<AuditEventResponse>> audit(@PathVariable String id) {
        if (!orders.containsKey(id)) {
            return ResponseEntity.notFound().build();
        }

        List<AuditEventResponse> payload = auditByOrder
                .getOrDefault(id, List.of())
                .stream()
                .map(event -> new AuditEventResponse(
                        event.id,
                        event.orderId,
                        event.message,
                        event.createdAt
                ))
                .toList();

        return ResponseEntity.ok(payload);
    }

    private void addAudit(String orderId, String message) {
        AuditEvent event = new AuditEvent();
        event.id = UUID.randomUUID().toString();
        event.orderId = orderId;
        event.message = message;
        event.createdAt = Instant.now();

        auditByOrder.computeIfAbsent(orderId, _ignored -> new ArrayList<>()).add(event);
    }

    private String safeReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "Sem observação.";
        }
        return reason;
    }

    private OrderResponse toResponse(OrderAggregate order) {
        return new OrderResponse(
                order.id,
                order.customer,
                order.channel,
                order.value,
                order.sku,
                order.quantity,
                order.deadlineDays,
                order.status,
                order.stockReserved,
                order.createdAt
        );
    }
}
