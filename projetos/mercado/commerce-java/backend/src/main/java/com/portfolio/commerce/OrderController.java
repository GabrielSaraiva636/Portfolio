package com.portfolio.commerce;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

record CreateOrderRequest(
        @NotBlank String customer,
        @NotBlank String channel,
        @Min(1) double value,
        @Min(1) int deadlineDays
) {}

record OrderResponse(
        String id,
        String customer,
        String channel,
        double value,
        int deadlineDays,
        String status,
        Instant createdAt
) {}

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @GetMapping("/health")
    public String health() {
        return "ok";
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@RequestBody CreateOrderRequest request) {
        return new OrderResponse(
                UUID.randomUUID().toString(),
                request.customer(),
                request.channel(),
                request.value(),
                request.deadlineDays(),
                "NEW",
                Instant.now()
        );
    }
}
